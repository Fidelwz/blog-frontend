import { test, expect } from "@playwright/test";

const origin = "http://localhost:3015";

test("el diálogo de normas retiene el foco y lo devuelve al cerrar con Escape", async ({
  page,
}, testInfo) => {
  await page.goto("/acceso");
  const trigger = page.getByRole("button", { name: "Normas de convivencia" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Aprendemos con respeto" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Cerrar diálogo" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("normas-desktop.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("el campo compartido conserva contraseña, etiqueta, foco y descripción del error", async ({
  page,
}) => {
  let logins = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/auth/login")) logins++;
  });
  await page.goto("/acceso");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  const email = page.getByLabel("Correo electrónico");
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAccessibleDescription(
    "Escribe un correo electrónico válido.",
  );
  const password = page.getByLabel("Contraseña", { exact: true });
  await password.fill("SoloParaVista123!");
  await page.getByRole("button", { name: "Mostrar contraseña" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("SoloParaVista123!");
  await page.getByRole("button", { name: "Ocultar contraseña" }).click();
  await expect(password).toHaveAttribute("type", "password");
  expect(logins).toBe(0);
});

test("el registro exige consentimiento accesible antes de crear la cuenta", async ({
  page,
}, testInfo) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") writes.push(request.url());
  });
  await page.goto("/registro");
  await page.getByLabel("Nombre", { exact: true }).fill("Ana");
  await page.getByLabel("Apellido", { exact: true }).fill("Pruebas");
  await page.getByLabel("Correo electrónico").fill(`ui-${Date.now()}@example.test`);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("SimulationPassword123!");
  await page.getByLabel("Confirmar contraseña", { exact: true }).fill("SimulationPassword123!");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  const consent = page.getByRole("checkbox", {
    name: "Acepto las normas de convivencia de la comunidad.",
  });
  await expect(consent).toBeFocused();
  await expect(consent).toHaveAttribute("aria-invalid", "true");
  expect(writes).toEqual([]);
  await page.keyboard.press("Space");
  await expect(consent).toBeChecked();
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await expect(page).toHaveURL(/\/acceso\?registro=ok$/);
  await expect(page.getByText("Cuenta creada. Inicia sesión.")).toBeVisible();
  expect(writes).toEqual([`${origin}/api/auth/register`]);
  await page.screenshot({
    path: testInfo.outputPath("registro-desktop.png"),
    fullPage: true,
  });
});

test("recuperación y restablecimiento completan sus solicitudes", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") writes.push(request.url());
  });
  await page.goto("/recuperar");
  await page.getByLabel("Correo electrónico").fill("ana@example.test");
  await page.getByRole("button", { name: "Enviar instrucciones" }).click();
  await expect(page.getByText("Si existe una cuenta con ese correo, recibirás instrucciones.")).toBeVisible();
  await page.goto(`/recuperar/${"a".repeat(43)}`);
  await page
    .getByLabel("Nueva contraseña", { exact: true })
    .fill("SimulationPassword123!");
  await page.getByLabel("Confirmar contraseña", { exact: true }).fill("SimulationPassword123!");
  await page.getByRole("button", { name: "Restablecer contraseña" }).click();
  await expect(page).toHaveURL(/\/acceso\?restablecida=ok$/);
  await expect(page.getByText("Contraseña actualizada. Inicia sesión.")).toBeVisible();
  expect(writes).toEqual([`${origin}/api/auth/forgot-password`, `${origin}/api/auth/reset-password`]);
});

test("publicaciones permiten cargar más, filtrar con teclado, buscar y leer", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("article")).toHaveCount(3);
  await page.screenshot({
    path: testInfo.outputPath("inicio-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cargar más publicaciones" }).click();
  await expect(page.getByRole("article")).toHaveCount(6);
  const filters = page.getByLabel("Filtrar por materia");
  await filters.getByText("Todas", { exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    filters.getByRole("radio", { name: "Bases de Datos", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByRole("article")).toHaveCount(2);
  await expect(
    page.getByRole("heading", {
      name: "JOIN en SQL: ¿cuál necesito para mi consulta?",
    }),
  ).toBeVisible();
  await page
    .getByRole("heading", {
      name: "Cómo normalizar una base de datos hasta 3FN",
    })
    .click();
  await expect(page).toHaveURL(/\/publicaciones\/1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Cómo normalizar una base de datos hasta 3FN",
  );
  await page.goto("/buscar");
  await page.getByLabel("Término de búsqueda").fill("sin-coincidencias-12345");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Todavía no encontramos coincidencias" }),
  ).toBeVisible();
  await page.goto("/buscar?categoria=no-existe");
  await expect(page.getByRole("article")).toHaveCount(3);
});

test("menú de cuenta navega con teclado y los módulos pendientes mantienen sus vistas", async ({
  page,
  context,
}, testInfo) => {
  await context.addCookies([
    {
      name: "jwt",
      value: "mock.ana.session",
      url: origin,
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto("/perfil");
  await expect(page.getByLabel("Nombre", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Ana");
  await page.screenshot({
    path: testInfo.outputPath("perfil-desktop.png"),
    fullPage: true,
  });
  const trigger = page.getByRole("button", { name: "Menú de Ana Pruebas" });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: "Mi perfil", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: "Cerrar sesión", exact: true }),
  ).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("menu-desktop.png") });
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  const routes = [
    ["/grupos", "Juntos llegamos más lejos."],
    ["/mis-publicaciones", "Tus ideas, en un solo lugar."],
    ["/notificaciones", "No te pierdas una buena conversación."],
    ["/publicaciones/nueva", "Hay algo que solo tú puedes compartir."],
  ];
  for (const [path, title] of routes) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(
      page.getByText("Módulo planificado · Aún no implementado"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Volver a la demostración" }),
    ).toHaveAttribute("href", "/inicio");
  }
});

test("las pantallas y el diálogo se adaptan a móvil sin desbordamiento horizontal", async ({
  page,
  context,
}, testInfo) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of [
      "/acceso",
      "/registro",
      "/",
      "/buscar",
      "/publicaciones/1",
    ]) {
      await page.goto(path);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${path} a ${width}px`,
      ).toBe(true);
      if (width === 390 && ["/acceso", "/"].includes(path)) {
        await page.screenshot({
          path: testInfo.outputPath(
            `${path === "/" ? "inicio" : "login"}-mobile.png`,
          ),
          fullPage: true,
        });
      }
    }
    await page.goto("/acceso");
    await page.getByRole("button", { name: "Normas de convivencia" }).click();
    const dialog = page.getByRole("dialog", { name: "Aprendemos con respeto" });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
  }
  await context.addCookies([
    {
      name: "jwt",
      value: "mock.ana.session",
      url: origin,
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
    },
  ]);
  for (const path of [
    "/perfil",
    "/grupos",
    "/notificaciones",
    "/mis-publicaciones",
    "/publicaciones/nueva",
  ]) {
    await page.goto(path);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      path,
    ).toBe(true);
  }
  await page.goto("/ruta-inexistente");
  await expect(
    page.getByRole("heading", {
      name: "Este camino no lleva a una publicación.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Volver al inicio" }),
  ).toHaveAttribute("href", "/");
});
