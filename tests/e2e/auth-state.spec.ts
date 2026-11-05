import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const origin = "http://localhost:3015";
const password = "SimulationPassword123!";
async function cookie(context: BrowserContext, account: string) {
  await context.addCookies([{ name: "jwt", value: `mock.${account}.session`, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
}
async function login(page: Page, email = "ana@example.test") {
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
}
async function signOut(page: Page, name: string) {
  await page.getByRole("button", { name: `Menú de ${name} Pruebas` }).click();
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
}
async function revalidateOnFocus(page: Page) {
  await page.clock.setSystemTime(Date.now() + 61_000);
  const response = page.waitForResponse(response => response.url().endsWith("/api/auth/me"));
  await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));
  return response;
}

test("la hidratación evita duplicados y una sola query actualiza menú y perfil", async ({ page, context }) => {
  const failures: string[] = [];
  page.on("pageerror", error => failures.push(error.message));
  let meRequests = 0;
  page.on("request", request => { if (request.url().endsWith("/api/auth/me")) meRequests++; });
  await cookie(context, "ana");
  await page.goto("/perfil");
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Ana");
  await expect(page.getByRole("button", { name: "Menú de Ana Pruebas" })).toBeVisible();
  expect(meRequests).toBe(0);
  await cookie(context, "bob");
  expect((await revalidateOnFocus(page)).status()).toBe(200);
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Bruno");
  await expect(page.getByRole("button", { name: "Menú de Bruno Pruebas" })).toBeVisible();
  expect(meRequests).toBe(1);
  expect(failures).toEqual([]);
});

test("una caída durante revalidación conserva la identidad y permite reintentar", async ({ page, context }) => {
  await cookie(context, "ana");
  await page.goto("/perfil");
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Ana");
  await cookie(context, "unavailable");
  expect((await revalidateOnFocus(page)).status()).toBe(502);
  await expect(page.getByText("No pudimos comprobar tu sesión.")).toBeVisible();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Ana");
  expect((await context.cookies()).some(c => c.name === "jwt")).toBe(true);
  await cookie(context, "ana");
  await page.getByRole("button", { name: "Comprobar sesión" }).click();
  await expect(page.getByText("No pudimos comprobar tu sesión.")).toHaveCount(0);
});

test("el fallo inicial de sesión puede recuperarse sin convertirlo en logout", async ({ page, context }) => {
  await cookie(context, "unavailable");
  await page.goto("/acceso?next=/perfil");
  await expect(page.getByText("No pudimos comprobar tu sesión.")).toBeVisible();
  await cookie(context, "ana");
  await page.getByRole("button", { name: "Comprobar sesión" }).click();
  await expect(page).toHaveURL(`${origin}/perfil`);
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Ana");
});

test("401 en una página privada elimina identidad y conserva el aviso al redirigir", async ({ page, context }) => {
  await cookie(context, "ana");
  await page.goto("/perfil");
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Ana");
  await cookie(context, "expired");
  expect((await revalidateOnFocus(page)).status()).toBe(401);
  await expect(page).toHaveURL(/\/acceso\?next=%2Fperfil&notice=expired/);
  await expect(page.getByText("Tu sesión ha vencido. Inicia sesión nuevamente.")).toBeVisible();
  expect((await context.cookies()).some(c => c.name === "jwt")).toBe(false);
  await page.getByRole("button", { name: "Descartar aviso de sesión" }).click();
  await expect(page.getByText("Tu sesión ha vencido. Inicia sesión nuevamente.")).toHaveCount(0);
});

test("403 en una página pública retira identidad sin redirigir", async ({ page, context }) => {
  await cookie(context, "ana");
  await page.goto("/buscar");
  await expect(page.getByRole("button", { name: "Menú de Ana Pruebas" })).toBeVisible();
  await cookie(context, "suspended");
  expect((await revalidateOnFocus(page)).status()).toBe(403);
  await expect(page.getByText("Tu cuenta está suspendida. Comunícate con el administrador.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Menú de Ana Pruebas" })).toHaveCount(0);
  await expect(page).toHaveURL(`${origin}/buscar`);
  expect((await context.cookies()).some(c => c.name === "jwt")).toBe(false);
});

test("dos pestañas sincronizan login y logout sin compartir perfiles ni tokens", async ({ page, context }) => {
  const other = await context.newPage();
  const events: Record<string, unknown>[] = [];
  await other.exposeFunction("recordAuthEvent", (data: Record<string, unknown>) => events.push(data));
  await other.addInitScript(() => {
    const channel = new BroadcastChannel("blog-auth-session");
    channel.onmessage = event => {
      void (window as unknown as { recordAuthEvent: (data: unknown) => Promise<void> }).recordAuthEvent(event.data);
    };
  });
  await other.goto("/buscar");
  await page.goto("/acceso?next=/perfil");
  await login(page);
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Ana");
  await expect(other.getByRole("button", { name: "Menú de Ana Pruebas" })).toBeVisible();
  await signOut(other, "Ana");
  await expect(other).toHaveURL(`${origin}/acceso`);
  await expect(page).toHaveURL(/\/acceso/);
  await expect(page.getByRole("button", { name: "Iniciar sesión", exact: true })).toBeVisible();
  expect(events.length).toBeGreaterThan(0);
  for (const event of events) {
    expect(Object.keys(event).sort()).toEqual(["sender", "type"]);
    expect(event.type).toBe("session-changed");
  }
  await other.close();
});

test("cambiar de cuenta y volver atrás no restaura el perfil anterior", async ({ page }) => {
  await page.goto("/acceso?next=/perfil");
  await login(page);
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Ana");
  await page.goto("/buscar");
  await signOut(page, "Ana");
  await expect(page).toHaveURL(`${origin}/acceso`);
  await login(page, "bob@example.test");
  await expect(page.getByRole("heading", { name: /Hola, Bruno/ })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(`${origin}/perfil`);
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Bruno");
  await expect(page.getByRole("button", { name: "Menú de Ana Pruebas" })).toHaveCount(0);
  expect(await page.evaluate(() => [JSON.stringify(localStorage), JSON.stringify(sessionStorage)].join(" "))).not.toMatch(/mock\.|SimulationPassword/);
});

test("dos renders SSR concurrentes hidratan perfiles independientes", async ({ browser }) => {
  const a = await browser.newContext(), b = await browser.newContext();
  try {
    await cookie(a, "ana"); await cookie(b, "bob");
    const first = await a.newPage(), second = await b.newPage();
    await Promise.all([first.goto(`${origin}/perfil`), second.goto(`${origin}/perfil`)]);
    await expect(first.getByLabel("Nombre", { exact: true })).toHaveValue("Ana");
    await expect(second.getByLabel("Nombre", { exact: true })).toHaveValue("Bruno");
  } finally { await a.close(); await b.close(); }
});
