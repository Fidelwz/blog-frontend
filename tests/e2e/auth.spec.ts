import { test, expect } from "@playwright/test";

const origin = "http://localhost:3015";
const credentials = { email: "ana@example.test", password: "SimulationPassword123!" };
const headers = { Origin: origin };

test("login, recarga, perfil público y logout con cookie HttpOnly", async ({ page, context }) => {
  await page.goto("/perfil");
  await expect(page).toHaveURL(/\/acceso\?next=%2Fperfil/);
  await page.getByLabel("Correo electrónico").fill(credentials.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(`${origin}/perfil`);
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Ana");
  const cookie = (await context.cookies()).find(c => c.name === "jwt");
  expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "Strict", domain: "localhost", path: "/" });
  expect(cookie!.expires - Date.now() / 1000).toBeLessThanOrEqual(3600);
  expect(await page.evaluate(() => document.cookie)).not.toContain("jwt=");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain("mock.ana");
  await page.reload();
  await expect(page.getByLabel("Correo electrónico")).toHaveValue(credentials.email);
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Ana Pruebas/ })).toBeVisible();
  await page.getByRole("button", { name: /Ana Pruebas/ }).click();
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/acceso`);
  expect((await context.cookies()).some(c => c.name === "jwt")).toBe(false);
  await page.goto("/perfil");
  await expect(page).toHaveURL(/\/acceso/);
});

test("validación local, credenciales erróneas y cuenta suspendida", async ({ page }) => {
  let submissions = 0;
  page.on("request", request => { if (request.url().endsWith("/api/auth/login")) submissions++; });
  await page.goto("/acceso");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByText("Escribe un correo electrónico válido.")).toBeVisible();
  expect(submissions).toBe(0);
  await page.getByLabel("Correo electrónico").fill(credentials.email);
  await page.getByLabel("Contraseña", { exact: true }).fill("incorrecta");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.locator(".alert-error")).toContainText("correo o la contraseña son incorrectos");
  expect(submissions).toBe(1);
  await page.getByLabel("Correo electrónico").fill("suspended@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.locator(".alert-error")).toContainText("cuenta está suspendida");
  expect(submissions).toBe(2);
});

test("sesión vencida redirige y /me elimina la cookie inválida", async ({ page, context }) => {
  await context.addCookies([{ name: "jwt", value: "mock.expired.session", url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  await page.goto("/perfil");
  await expect(page).toHaveURL(/\/acceso/);
  await expect(page.getByText("Tu sesión ha vencido. Inicia sesión nuevamente.")).toBeVisible();
  const response = await context.request.get("/api/auth/me");
  expect(response.status()).toBe(401);
  expect((await context.cookies()).some(c => c.name === "jwt")).toBe(false);
});

test("vista móvil y retorno malicioso quedan en el sitio", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/acceso?next=//attacker.test");
  await page.getByLabel("Correo electrónico").fill(credentials.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(`${origin}/inicio`);
  await expect(page.getByRole("heading", { name: /Hola, Ana/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("todas las páginas privadas exigen sesión aun con datos de demostración", async ({ request }) => {
  for (const path of ["/inicio", "/perfil", "/grupos", "/mis-publicaciones", "/notificaciones", "/publicaciones/nueva"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    const body = await response.text();
    // Next can stream a redirect as metadata after sending the initial HTML.
    expect([200, 307]).toContain(response.status());
    expect(response.headers().location || body).toContain("/acceso?next=");
    expect(body).not.toContain("mock.ana.session");
  }
  expect((await request.get("/buscar")).status()).toBe(200);
});

test("endpoints locales aplican origen, DTO y respuestas vacías", async ({ request }) => {
  expect((await request.post("/api/auth/login", { data: credentials })).status()).toBe(403);
  expect((await request.post("/api/auth/login", { headers: { Origin: "https://attacker.test" }, data: credentials })).status()).toBe(403);
  expect((await request.post("/api/auth/login", { headers, data: { ...credentials, role: "administrador" } })).status()).toBe(400);
  const success = await request.post("/api/auth/login", { headers, data: credentials });
  expect(success.status()).toBe(200);
  expect(success.headers()["cache-control"]).toContain("no-store");
  expect(await success.json()).toMatchObject({ id: 42, role: "usuario", status: "activo" });
  expect(await success.text()).not.toContain("mock.ana.session");
  expect((await request.get("/api/auth/me")).status()).toBe(200);
  const out = await request.post("/api/auth/logout", { headers });
  expect(out.status()).toBe(204);
  expect(await out.text()).toBe("");
  expect((await request.get("/api/auth/me")).status()).toBe(401);
});

test("sesiones de usuarios distintos no comparten caché", async ({ playwright }) => {
  const first = await playwright.request.newContext({ baseURL: origin });
  const second = await playwright.request.newContext({ baseURL: origin });
  try {
    await first.post("/api/auth/login", { headers, data: credentials });
    await second.post("/api/auth/login", { headers, data: { ...credentials, email: "bob@example.test" } });
    const profiles = await Promise.all([first.get("/api/auth/me"), second.get("/api/auth/me")]);
    expect((await profiles[0].json()).id).toBe(42);
    expect((await profiles[1].json()).id).toBe(43);
  } finally { await first.dispose(); await second.dispose(); }
});

test("errores de upstream y contratos incompletos no crean sesiones", async ({ request }) => {
  for (const email of ["unavailable@example.test", "invalid@example.test", "missing-cookie@example.test"]) {
    const response = await request.post("/api/auth/login", { headers, data: { ...credentials, email } });
    expect(response.status()).toBe(502);
    expect(response.headers()["set-cookie"]).toBeUndefined();
    expect(await response.text()).not.toContain("<h1>");
  }
});

test("un servicio lento tiene límite de espera y no reintenta el login", async ({ page }) => {
  await page.goto("/acceso");
  await page.getByLabel("Correo electrónico").fill("slow@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill(credentials.password);
  let submissions = 0;
  page.on("request", request => { if (request.url().endsWith("/api/auth/login")) submissions++; });
  await page.locator("form").evaluate(form => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await expect(page.getByRole("button", { name: "Iniciando sesión…" })).toBeDisabled();
  await page.locator("form").evaluate(form => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await expect(page.locator(".alert-error")).toContainText("tardó demasiado", { timeout: 20_000 });
  expect(submissions).toBe(1);
  await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeEnabled();
});

test("caída de /me conserva la cookie y presenta un error recuperable", async ({ page, context }) => {
  await context.addCookies([{ name: "jwt", value: "mock.unavailable.session", url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  const result = await context.request.get("/api/auth/me");
  expect(result.status()).toBe(502);
  expect((await context.cookies()).some(c => c.name === "jwt")).toBe(true);
  await page.goto("/perfil");
  await expect(page.getByRole("heading", { name: "No pudimos cargar esta página." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Volver a intentar" })).toBeVisible();
  await expect(page).toHaveURL(`${origin}/perfil`);
});

test("logout fallido permite reintentar sin simular un cierre exitoso", async ({ page, context }) => {
  await context.request.post("/api/auth/login", { headers, data: credentials });
  await page.goto("/perfil");
  await context.addCookies([{ name: "jwt", value: "mock.unavailable.session", url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  await page.getByRole("button", { name: /Ana Pruebas/ }).click();
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(page.locator(".alert-error")).toContainText("no está disponible");
  await expect(page).toHaveURL(`${origin}/perfil`);
  expect((await context.cookies()).find(c => c.name === "jwt")?.value).toBe("mock.unavailable.session");
  await context.addCookies([{ name: "jwt", value: "mock.ana.session", url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/acceso`);
});
