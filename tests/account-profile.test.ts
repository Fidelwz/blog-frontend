import { test } from "node:test";
import assert from "node:assert/strict";
import { isResetToken, passwordRules } from "../src/lib/validation.ts";
import { createAuthApi } from "../src/features/auth/api.ts";
import { createProfileApi } from "../src/features/profile/api.ts";
import { normalizeProfileId, parseBackendProfile, parseBackendPublicProfile } from "../src/features/profile/server/profile.ts";
import { buildProfilePatch, parseProfilePatch, profileValues } from "../src/features/profile/validation.ts";
import { MAX_PHOTO_BYTES, photoError } from "../src/features/profile/photo.ts";
import { cacheProfile, clearInvalidProfileSession } from "../src/features/profile/cache.ts";
import { profileKey, profileOptions } from "../src/features/profile/query-options.ts";
import { createQueryClient } from "../src/lib/query/client.ts";
import { sessionKey, replaceSession } from "../src/features/auth/cache.ts";
import { ApiError } from "../src/lib/api/client.ts";
import type { AuthSession } from "../src/features/auth/types.ts";

const raw = { id: "42", firstName: "Ana", lastName: "Pruebas", email: "ana@example.test", role: "user", status: "active",
  photoUrl: null, major: "Sistemas", university: null, bio: "Hola", registeredAt: "2026-11-05T12:00:00Z", _count: { posts: 2, groups: 1 },
  photoPublicId: "internal", suspendedUntil: null, suspensionReason: "private", suspendedBy: 99, password: "never-return", token: "never-return" };
const profile = parseBackendProfile(raw);

test("perfil normaliza ID seguro, roles y estados sin ampliar AuthUser", () => {
  assert.equal(normalizeProfileId("42"), 42);
  assert.equal(normalizeProfileId(42), 42);
  for (const value of [0, -1, 1.2, "0", "01", "-1", "1.2", "1e2", " 1", "42\n", "9007199254740992", null]) assert.throws(() => normalizeProfileId(value));
  assert.equal(profile.id, 42);
  assert.equal(profile.role, "usuario");
  assert.equal(parseBackendProfile({ ...raw, role: "administrator", status: "suspended" }).role, "administrador");
  assert.equal(parseBackendProfile({ ...raw, status: "suspended" }).status, "suspendido");
  assert.throws(() => parseBackendProfile({ ...raw, role: "superadmin" }));
  assert.throws(() => parseBackendProfile({ ...raw, status: "unknown" }));
});

test("los adaptadores excluyen campos internos y el público excluye correo y estado", () => {
  for (const value of [profile, parseBackendPublicProfile(raw)]) {
    for (const key of ["photoPublicId", "suspendedUntil", "suspensionReason", "suspendedBy", "password", "token"]) assert.equal(Object.hasOwn(value, key), false);
  }
  const publicProfile = parseBackendPublicProfile(raw);
  assert.equal(Object.hasOwn(publicProfile, "email"), false);
  assert.equal(Object.hasOwn(publicProfile, "status"), false);
  assert.deepEqual(publicProfile._count, { posts: 2, groups: 1 });
  assert.throws(() => parseBackendProfile({ ...raw, photoUrl: "javascript:alert(1)" }));
  assert.throws(() => parseBackendProfile({ ...raw, _count: { posts: -1, groups: 0 } }));
});

test("PATCH contiene solo cambios, recorta y usa null para borrar opcionales", () => {
  const baseline = profileValues(profile);
  assert.deepEqual(buildProfilePatch(baseline, { ...baseline }), {});
  assert.deepEqual(buildProfilePatch(baseline, { ...baseline, firstName: "  Anita  ", major: "", bio: "  " }), { firstName: "Anita", major: null, bio: null });
  assert.deepEqual(buildProfilePatch(baseline, { ...baseline, firstName: " Ana " }), {});
  assert.throws(() => buildProfilePatch(baseline, { ...baseline, firstName: " " }));
  assert.deepEqual(parseProfilePatch({ major: null, bio: "" }), { major: null, bio: null });
  for (const value of [{ firstName: null }, { lastName: "" }, { major: 10 }, { bio: "x".repeat(501) }, { role: "administrator" }, {}]) assert.throws(() => parseProfilePatch(value));
});

test("contraseña admite mayúsculas Unicode y limita caracteres y bytes", () => {
  assert.equal(passwordRules("Ωmega123!").every(Boolean), true);
  for (const value of ["abcdefg1!", "Password!", "Password1", "Abc1!", "A1!" + "a".repeat(70), "A1!" + "é".repeat(35)]) assert.equal(passwordRules(value).every(Boolean), false);
  assert.equal(passwordRules("A1!" + "a".repeat(69)).every(Boolean), true);
});

test("token requiere 43 caracteres base64url exactos", () => {
  assert.equal(isResetToken("A_b-012" + "a".repeat(36)), true);
  for (const value of ["", "a".repeat(42), "a".repeat(44), "a".repeat(42) + "=", "a".repeat(42) + "/", "a".repeat(43) + "\n"]) assert.equal(isResetToken(value), false);
});

test("registro y reset envían solo DTO y limpian variables incluso si falla la red", async () => {
  for (const failing of [false, true]) {
    let calls = 0;
    const api = createAuthApi(async (url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      assert.equal(init?.cache, "no-store");
      assert.equal(init?.credentials, "include");
      assert.ok(init?.signal);
      if (String(url).endsWith("/register")) assert.deepEqual(Object.keys(body).sort(), ["email", "firstName", "lastName", "password"]);
      else assert.deepEqual(Object.keys(body).sort(), ["newPassword", "token"]);
      if (failing) throw new TypeError("offline");
      return String(url).endsWith("/register") ? Response.json({ message: "ok" }, { status: 201 }) : new Response(null, { status: 204 });
    });
    const registration = { firstName: "Ana", lastName: "Test", email: "test@example.test", password: "TestPass123!", acepta: true };
    const reset = { token: "a".repeat(43), newPassword: "TestPass123!", confirmacion: "never-send" };
    if (failing) { await assert.rejects(api.register(registration)); await assert.rejects(api.resetPassword(reset)); }
    else { await api.register(registration); await api.resetPassword(reset); }
    assert.equal(registration.password, "");
    assert.equal(registration.email, "");
    assert.equal(reset.token, "");
    assert.equal(reset.newPassword, "");
    assert.equal(calls, 2);
  }
});

test("recuperación envía email y descarta el body de respuesta", async () => {
  const data = { email: "test@example.test" };
  const api = createAuthApi(async (_url, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), { email: data.email });
    return Response.json({ message: "neutral" }, { status: 202 });
  });
  assert.equal(await api.forgotPassword(data), undefined);
  assert.equal(data.email, "");
});

test("foto valida tamaño, formato y archivo vacío", () => {
  assert.equal(photoError({ size: MAX_PHOTO_BYTES, type: "image/png" }), null);
  assert.equal(photoError({ size: MAX_PHOTO_BYTES + 1, type: "image/jpeg" })?.status, 413);
  assert.equal(photoError({ size: 100, type: "image/gif" })?.status, 415);
  assert.equal(photoError({ size: 0, type: "image/png" })?.status, 400);
});

test("subida usa multipart file sin Content-Type manual y libera la variable", async () => {
  const file = new File(["synthetic image"], "foto.png", { type: "image/png" });
  const data: { file: File | null } = { file };
  const api = createProfileApi(async (url, init) => {
    assert.equal(url, "/api/users/me/photo");
    assert.equal(init?.method, "PUT");
    assert.equal(new Headers(init?.headers).has("Content-Type"), false);
    assert.ok(init?.body instanceof FormData);
    assert.deepEqual([...init.body.keys()], ["file"]);
    assert.equal(init.body.get("file"), file);
    return Response.json(profile);
  });
  assert.deepEqual(await api.uploadPhoto(data), profile);
  assert.equal(data.file, null);
});

test("guardar sincroniza sesión, cancela lecturas viejas y elimina caché privada al salir", async () => {
  const client = createQueryClient();
  client.setQueryData(sessionKey, { status: "authenticated", user: { ...profile } });
  let resolve!: (value: typeof profile) => void;
  let signal!: AbortSignal;
  const late = client.fetchQuery({ ...profileOptions(), queryFn: context => {
    signal = context.signal;
    return new Promise<typeof profile>(done => { resolve = done; });
  } }).catch(() => undefined);
  const updated = { ...profile, firstName: "Anita", photoUrl: "https://images.example.test/photo.png" };
  assert.equal(await cacheProfile(client, updated), true);
  resolve(profile);
  await late;
  assert.equal(signal.aborted, true);
  const session = client.getQueryData<AuthSession>(sessionKey)!;
  assert.equal(session.user?.firstName, "Anita");
  assert.equal(session.user?.photoUrl, updated.photoUrl);
  assert.equal(Object.hasOwn(session.user!, "major"), false);
  assert.equal(client.getQueryData<typeof profile>(profileKey)?.firstName, "Anita");
  await replaceSession(client, { status: "anonymous", user: null });
  assert.equal(client.getQueryData(profileKey), undefined);
  assert.equal(await cacheProfile(client, updated), false);
  client.clear();
});

test("fallos privados 401/403 limpian sesión, fallos de red la conservan", async () => {
  const client = createQueryClient();
  for (const status of [503, 401, 403]) {
    client.setQueryData(sessionKey, { status: "authenticated", user: profile });
    await clearInvalidProfileSession(client, new ApiError({ statusCode: status, error: "test", mensaje: "test" }));
    assert.equal(client.getQueryData<AuthSession>(sessionKey)?.status, status === 503 ? "authenticated" : status === 401 ? "expired" : "suspended");
  }
  client.clear();
});
