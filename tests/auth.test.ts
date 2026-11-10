import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAuthUser } from "../src/features/auth/types.ts";
import { parseBackendAuthUser } from "../src/features/auth/server/profile.ts";
import { safeReturnPath } from "../src/features/auth/utils.ts";
import { readSessionCookie } from "../src/features/auth/server/cookie.ts";
import { ApiError, createApiClient } from "../src/lib/api/client.ts";

test("el perfil conserva los enums e ID numérico, y excluye campos privados", () => {
  const profile = { id: 42, firstName: "Ana", lastName: "Pruebas", email: "ana@example.test", role: "usuario", status: "activo", photoUrl: null };
  assert.deepEqual(parseAuthUser({ ...profile, passwordHash: "secret", jwt: "secret" }), profile);
  assert.throws(() => parseAuthUser({ ...profile, id: "42" }));
  assert.throws(() => parseAuthUser({ ...profile, role: "admin" }));
});

test("el adaptador acepta user/active de Heroku y mantiene el contrato interno", () => {
  const upstream = { id: 42, firstName: "Ana", lastName: "Pruebas", email: "ana@example.test", role: "user", status: "active", photoUrl: null, jwt: "private", passwordHash: "private" };
  assert.deepEqual(parseBackendAuthUser(upstream), {
    id: 42, firstName: "Ana", lastName: "Pruebas", email: "ana@example.test",
    role: "usuario", status: "activo", photoUrl: null,
  });
  assert.equal(upstream.role, "user");
  assert.equal(upstream.status, "active");
  // Browser clients still receive only the canonical, public representation.
  assert.throws(() => parseAuthUser(upstream));
});

test("el adaptador conserva los roles y estados del contrato original", () => {
  for (const role of ["usuario", "administrador"]) {
    for (const status of ["activo", "suspendido"]) {
      const profile = { id: 42, firstName: "Ana", lastName: "Pruebas", email: "ana@example.test", role, status, photoUrl: null };
      assert.deepEqual(parseBackendAuthUser(profile), profile);
    }
  }
});

test("el administrador de Nest conserva sus permisos y estado sin filtrar secretos", () => {
  for (const [status, expected] of [["active", "activo"], ["suspended", "suspendido"]]) {
    const profile = parseBackendAuthUser({ id: 43, firstName: "Bruno", lastName: "Pruebas", email: "bob@example.test", role: "administrator", status, photoUrl: null, jwt: "private", passwordHash: "private" });
    assert.equal(profile.role, "administrador");
    assert.equal(profile.status, expected);
    assert.equal("jwt" in profile, false);
    assert.equal("passwordHash" in profile, false);
  }
});

test("el adaptador no asigna permisos ni estado activo a valores desconocidos", () => {
  const profile = { id: 42, firstName: "Ana", lastName: "Pruebas", email: "ana@example.test", role: "user", status: "active", photoUrl: null };
  for (const invalid of [
    null, [], {}, { user: profile }, { ...profile, id: "42" },
    { ...profile, role: "superadmin" }, { ...profile, role: "admin" },
    { ...profile, status: "inactive" }, { ...profile, status: undefined },
    { ...profile, photoUrl: undefined },
  ]) assert.throws(() => parseBackendAuthUser(invalid));
});

test("el retorno del login rechaza destinos externos, variantes codificadas y bucles", () => {
  for (const path of ["https://attacker.test", "//attacker.test", "/\\attacker.test", "/%2f%2fattacker.test", "/%5cattacker.test", "/api/auth/logout", "/%61cceso", "/acceso?next=/acceso", "/registro", "/a\nb"]) {
    assert.equal(safeReturnPath(path), "/inicio", path);
  }
  assert.equal(safeReturnPath("/perfil?tab=datos#nombre"), "/perfil?tab=datos#nombre");
});

test("la cookie reenviada respeta su vencimiento y solo acepta jwt", () => {
  const now = Date.parse("2026-11-03T12:00:00Z");
  const cookie = readSessionCookie(["other=ignored", "jwt=a.b.c; Domain=herokuapp.com; HttpOnly; Max-Age=3600; Expires=Tue, 03 Nov 2026 12:30:00 GMT"], now);
  assert.equal(cookie.value, "a.b.c");
  assert.equal(cookie.maxAge, 1800);
  assert.equal(cookie.expires.toISOString(), "2026-11-03T12:30:00.000Z");
  assert.equal(readSessionCookie(["jwt=a.b.c; Max-Age=99999"], now).maxAge, 3600);
  for (const headers of [[], ["jwt=; Max-Age=0"], ["jwt=a.b.c; Max-Age=0"], ["jwt=a.b.c; Expires=Tue, 03 Nov 2026 11:00:00 GMT"], ["jwt=a\r\nb"]]) {
    assert.throws(() => readSessionCookie(headers, now));
  }
});

test("el cliente entiende los mensajes de Nest como string o lista", async () => {
  for (const message of ["Correo inválido", ["Correo inválido", "Contraseña obligatoria"]]) {
    const request = createApiClient("/api/auth", async () => Response.json({ message }, { status: 400 }));
    await assert.rejects(request("/login"), (e: unknown) => e instanceof ApiError && e.status === 400 && e.message.includes("Correo inválido"));
  }
});
