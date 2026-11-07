import { test, expect, type APIRequestContext } from "@playwright/test";

const origin = "http://localhost:3015";
const headers = { Origin: origin };
const password = "SimulationPassword123!";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC1sAAAAASUVORK5CYII=", "base64");
async function createAccount(request: APIRequestContext, email = `account-${crypto.randomUUID()}@example.test`) {
  const created = await request.post("/api/auth/register", { headers, data: { firstName: "Clara", lastName: "Ejemplo", email, password } });
  expect(created.status()).toBe(201);
  expect(created.headers()["set-cookie"]).toBeUndefined();
  const login = await request.post("/api/auth/login", { headers, data: { email, password } });
  expect(login.status()).toBe(200);
  return await login.json() as { id: number; email: string };
}

test("registro evita doble envío, limpia contraseña y permite iniciar sesión", async ({ page, context }) => {
  const email = `register-${crypto.randomUUID()}@example.test`;
  let posts = 0;
  await page.route("**/api/auth/register", async route => {
    posts++;
    expect(Object.keys(route.request().postDataJSON()).sort()).toEqual(["email", "firstName", "lastName", "password"]);
    await route.continue();
  });
  await page.goto("/registro");
  await page.getByLabel("Nombre", { exact: true }).fill("Clara");
  await page.getByLabel("Apellido", { exact: true }).fill("Ejemplo");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByLabel("Confirmar contraseña", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
  await page.locator("form").evaluate(form => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await expect(page).toHaveURL(/\/acceso\?registro=ok$/);
  expect(posts).toBe(1);
  expect((await context.cookies()).some(c => c.name === "jwt")).toBe(false);
  await expect(page.getByText("Cuenta creada. Inicia sesión.")).toBeVisible();
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue("");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/inicio`);
  await expect(page.getByRole("button", { name: "Menú de Clara Ejemplo" })).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]))).not.toContain(password);
});

test("correo repetido muestra error específico y limpia ambos campos de contraseña", async ({ page }) => {
  await page.goto("/registro");
  await page.getByLabel("Nombre", { exact: true }).fill("Ana");
  await page.getByLabel("Apellido", { exact: true }).fill("Pruebas");
  await page.getByLabel("Correo electrónico").fill("ana@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByLabel("Confirmar contraseña", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await expect(page.getByText("Ya existe una cuenta con ese correo.")).toBeVisible();
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Confirmar contraseña", { exact: true })).toHaveValue("");
});

test("recuperación es neutra y los tokens malformados o vencidos bloquean el envío", async ({ page, request }) => {
  const responses = await Promise.all(["ana@example.test", "missing@example.test"].map(email => request.post("/api/auth/forgot-password", { headers, data: { email } })));
  expect(responses.map(r => r.status())).toEqual([202, 202]);
  expect(await responses[0].json()).toEqual(await responses[1].json());
  let writes = 0;
  page.on("request", req => { if (req.url().endsWith("/api/auth/reset-password")) writes++; });
  const response = await page.goto("/recuperar/invalido");
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(page.getByText("El enlace no es válido o ya venció. Solicita uno nuevo.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Restablecer contraseña" })).toHaveCount(0);
  expect(writes).toBe(0);
  await page.goto(`/recuperar/${"e".repeat(43)}`);
  await page.getByLabel("Nueva contraseña", { exact: true }).fill(password);
  await page.getByLabel("Confirmar contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Restablecer contraseña" }).click();
  await expect(page.getByText("El enlace no es válido o ya venció. Solicita uno nuevo.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Solicitar un nuevo enlace" })).toHaveAttribute("href", "/recuperar");
  await expect(page.getByRole("button", { name: "Restablecer contraseña" })).toHaveCount(0);
  expect(writes).toBe(1);
});

test("restablecimiento cambia la contraseña y rechaza reutilizar el enlace", async ({ request }) => {
  await createAccount(request, "reset@example.test");
  await request.post("/api/auth/logout", { headers });
  const newPassword = "NewSimulation123!";
  const data = { token: "r".repeat(43), newPassword };
  const reset = await request.post("/api/auth/reset-password", { headers, data });
  expect(reset.status()).toBe(204);
  expect(await reset.text()).toBe("");
  expect((await request.post("/api/auth/reset-password", { headers, data })).status()).toBe(410);
  expect((await request.post("/api/auth/login", { headers, data: { email: "reset@example.test", password } })).status()).toBe(401);
  expect((await request.post("/api/auth/login", { headers, data: { email: "reset@example.test", password: newPassword } })).status()).toBe(200);
});

test("nuevos handlers rechazan origen, claves extra y errores upstream sin filtrarlos", async ({ request }) => {
  const registration = { firstName: "Ana", lastName: "Test", email: "limited@example.test", password };
  for (const [path, data] of [
    ["/api/auth/register", registration], ["/api/auth/forgot-password", { email: "ana@example.test" }],
    ["/api/auth/reset-password", { token: "e".repeat(43), newPassword: password }],
  ] as const) {
    const denied = await request.post(path, { data });
    expect(denied.status()).toBe(403);
    expect(denied.headers()["cache-control"]).toBe("private, no-store");
    expect((await request.post(path, { headers: { Origin: "https://external.test" }, data })).status()).toBe(403);
    expect((await request.post(path, { headers, data: { ...data, role: "administrator" } })).status()).toBe(400);
  }
  expect((await request.post("/api/auth/register", { headers, data: registration })).status()).toBe(429);
  const failed = await request.post("/api/auth/register", { headers, data: { ...registration, email: "unavailable@example.test" } });
  expect(failed.status()).toBe(502);
  expect(await failed.text()).not.toMatch(/<h1>|Private upstream/);
  await createAccount(request);
  expect((await request.patch("/api/users/me", { headers, data: { email: "change@example.test" } })).status()).toBe(400);
  expect((await request.patch("/api/users/me", { headers, data: { firstName: null } })).status()).toBe(400);
  expect((await request.patch("/api/users/me", { data: { firstName: "Ana" } })).status()).toBe(403);
  expect((await request.put("/api/users/me/photo", { multipart: { file: { name: "foto.png", mimeType: "image/png", buffer: png } } })).status()).toBe(403);
});

test("perfil se hidrata sin duplicar GET, guarda solo cambios y actualiza menú y recarga", async ({ page, context }) => {
  await createAccount(context.request);
  let reads = 0;
  const writes: unknown[] = [];
  page.on("request", req => {
    if (req.url().endsWith("/api/users/me") && req.method() === "GET") reads++;
    if (req.url().endsWith("/api/users/me") && req.method() === "PATCH") writes.push(req.postDataJSON());
  });
  await page.goto("/perfil");
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Clara");
  expect(reads).toBe(0);
  await page.getByLabel("Nombre", { exact: true }).fill("Clarisa");
  await page.getByLabel("Carrera (opcional)").fill("Sistemas");
  await page.getByLabel("Biografía (opcional)").fill("Aprendiendo en comunidad");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Perfil actualizado", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Menú de Clarisa Ejemplo" })).toBeVisible();
  expect(writes[0]).toEqual({ firstName: "Clarisa", major: "Sistemas", bio: "Aprendiendo en comunidad" });
  await page.reload();
  await expect(page.getByLabel("Carrera (opcional)")).toHaveValue("Sistemas");
  await page.getByLabel("Carrera (opcional)").fill("");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Perfil actualizado", { exact: true })).toBeVisible();
  expect(writes[1]).toEqual({ major: null });
  const current = await context.request.get("/api/users/me");
  expect(current.headers()["cache-control"]).toBe("private, no-store");
  expect(await current.json()).toMatchObject({ firstName: "Clarisa", major: null });
  expect(await current.text()).not.toMatch(/photoPublicId|suspendedUntil|suspensionReason|suspendedBy/);
  await page.getByLabel("Nombre", { exact: true }).fill("Sin guardar");
  await page.locator(".sidebar").getByRole("link", { name: "Inicio", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Seguir editando" }).click();
  await page.getByRole("button", { name: "Descartar", exact: true }).click();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Clarisa");
});

test("foto valida archivo, conserva edición de datos y actualiza avatar y persistencia", async ({ page, context }, testInfo) => {
  const account = await createAccount(context.request);
  await page.route("https://images.example.test/**", route => route.fulfill({ contentType: "image/png", body: png }));
  await page.goto("/perfil");
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Clara");
  await page.getByLabel("Nombre", { exact: true }).fill("Edición pendiente");
  const input = page.getByLabel("Foto de perfil", { exact: true });
  await input.setInputFiles({ name: "foto.gif", mimeType: "image/gif", buffer: png });
  await expect(page.getByText("Solo JPG o PNG.")).toBeVisible();
  await input.setInputFiles({ name: "grande.png", mimeType: "image/png", buffer: Buffer.alloc(4 * 1024 * 1024 + 1) });
  await expect(page.getByText("La imagen no puede superar 4 MB.")).toBeVisible();
  await input.setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: png });
  await expect(page.getByText("Vista previa. Pulsa Guardar foto para subirla.")).toBeVisible();
  await page.getByRole("button", { name: "Guardar foto", exact: true }).click();
  await expect(page.getByText("Foto de perfil actualizada")).toBeVisible();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Edición pendiente");
  await expect(page.getByRole("button", { name: "Menú de Clara Ejemplo" }).locator("img")).toHaveAttribute("src", `https://images.example.test/profile-${account.id}.png`);
  await page.getByRole("button", { name: "Descartar", exact: true }).click();
  await page.reload();
  await expect(page.locator(".profile-summary img")).toHaveAttribute("src", `https://images.example.test/profile-${account.id}.png`);
  await page.screenshot({ path: testInfo.outputPath("perfil-foto.png"), fullPage: true });
  for (const [mimeType, size, status] of [["image/gif", 10, 415], ["image/png", 4 * 1024 * 1024 + 1, 413]] as const) {
    const response = await context.request.put("/api/users/me/photo", { headers, multipart: { file: { name: "file", mimeType, buffer: Buffer.alloc(size) } } });
    expect(response.status()).toBe(status);
  }
  const extra = await context.request.put("/api/users/me/photo", { headers, multipart: { file: { name: "photo.png", mimeType: "image/png", buffer: png }, admin: "true" } });
  expect(extra.status()).toBe(400);
});

test("perfil público funciona sin sesión, omite correo y presenta 404 y enlace propio", async ({ page, context }, testInfo) => {
  await page.goto("/usuarios/42");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ana Pruebas");
  await expect(page).toHaveTitle(/Ana Pruebas/);
  await expect(page.getByText("Todavía no ha compartido su carrera.")).toBeVisible();
  await expect(page.getByText("Publicaciones", { exact: true })).toBeVisible();
  const publicHtml = await (await context.request.get("/usuarios/42")).text();
  expect(publicHtml).not.toMatch(/ana@example.test|photoPublicId|suspensionReason/);
  await expect(page.getByRole("link", { name: "Editar mi perfil" })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("perfil-publico-mobile.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const id of ["0", "abc", "999999"]) {
    const missing = await page.goto(`/usuarios/${id}`);
    expect(missing?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Este camino no lleva a una publicación." })).toBeVisible();
  }
  const account = await createAccount(context.request);
  await page.goto(`/usuarios/${account.id}`);
  await expect(page.getByRole("link", { name: "Editar mi perfil" })).toHaveAttribute("href", "/perfil");
});

test("401 y 403 de perfil limpian la cookie; un fallo temporal la conserva", async ({ context }) => {
  for (const [key, status] of [["expired", 401], ["suspended", 403], ["unavailable", 502]] as const) {
    await context.addCookies([{ name: "jwt", value: `mock.${key}.session`, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
    const response = await context.request.get("/api/users/me");
    expect(response.status()).toBe(status);
    expect((await context.cookies()).some(c => c.name === "jwt")).toBe(status === 502);
  }
});
