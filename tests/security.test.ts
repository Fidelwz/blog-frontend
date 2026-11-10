import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizedIp, selectClientIp, signClientIdentity } from "../src/lib/server/client-identity.ts";
import { upstreamError } from "../src/lib/server/upstream-error.ts";
import { invalidatesSession } from "../src/features/auth/session-errors.ts";
import { createAuthApi } from "../src/features/auth/api.ts";

test("la fuente de IP requiere selección explícita; no usa XFF ni firmas del navegador", () => {
  const incoming = new Headers({ "x-forwarded-for": "203.0.113.9", "x-blog-client-ip": "203.0.113.9", "x-real-ip": "192.0.2.1", "x-vercel-forwarded-for": "192.0.2.2" });
  assert.equal(selectClientIp(incoming, "none", false), undefined);
  assert.equal(selectClientIp(incoming, "vercel", false), undefined);
  assert.equal(selectClientIp(incoming, "vercel", true), "192.0.2.2");
  assert.equal(selectClientIp(incoming, "trusted-proxy", false), "192.0.2.1");
  assert.equal(normalizedIp("192.0.2.1, 192.0.2.2"), undefined);
  assert.equal(normalizedIp("2001:0db8::1"), "2001:db8::1");
});

test("la firma cambia con IP, método, consulta o tiempo y no transporta cookies", () => {
  const secret = "synthetic-test-key-longer-than-32-characters";
  const signed = signClientIdentity("192.0.2.1", "https://example.test/api/v1/posts?q=matrices", "GET", secret, 1794170000000);
  assert.equal(signed.get("x-blog-client-ip"), "192.0.2.1");
  assert.equal(signed.has("cookie"), false);
  for (const [ip, method, url, time] of [
    ["192.0.2.2", "GET", "https://example.test/api/v1/posts?q=matrices", 1794170000000],
    ["192.0.2.1", "POST", "https://example.test/api/v1/posts?q=matrices", 1794170000000],
    ["192.0.2.1", "GET", "https://example.test/api/v1/posts?q=otro", 1794170000000],
    ["192.0.2.1", "GET", "https://example.test/api/v1/posts?q=matrices", 1794170000001],
  ] as const) assert.notEqual(signClientIdentity(ip, url, method, secret, time).get("x-blog-client-signature"), signed.get("x-blog-client-signature"));
  assert.throws(() => signClientIdentity("192.0.2.1", "https://example.test", "GET", "short"));
});

test("los errores conservan correlación y espera sin mostrar el mensaje upstream", async () => {
  const id = "f171fb3a-9a16-4f90-8c62-61f7e0cbdb46";
  const result = await upstreamError(Response.json({ message: "private-secret" }, { status: 429, headers: { "X-Request-ID": id, "Retry-After": "60" } }), 429, "Espera antes de reintentar.");
  assert.equal(result.correlationId, id);
  assert.equal(result.retryAfter, 60);
  assert.equal(result.code, "RateLimited");
  assert.equal(result.message.includes("private-secret"), false);
  const malformed = await upstreamError(Response.json({}, { status: 429, headers: { "X-Request-ID": "private", "Retry-After": "9999999" } }), 429, "Espera.");
  assert.equal(malformed.correlationId, undefined);
  assert.equal(malformed.retryAfter, undefined);
});

test("auth y perfil solo invalidan sesión por suspensión explícita, no por cualquier 403", async () => {
  for (const error of ["Forbidden", "AccountSuspended"]) {
    const result = await upstreamError(Response.json({ error }, { status: 403 }), 403, "Acceso denegado.");
    assert.equal(invalidatesSession(result), error === "AccountSuspended");
  }
  const denied = createAuthApi(async () => Response.json({ error: "Forbidden", message: "Sin permiso" }, { status: 403 }));
  await assert.rejects(denied.fetchSession());
  const suspended = createAuthApi(async () => Response.json({ error: "AccountSuspended", message: "Suspendida" }, { status: 403 }));
  assert.equal((await suspended.fetchSession()).status, "suspended");
});
