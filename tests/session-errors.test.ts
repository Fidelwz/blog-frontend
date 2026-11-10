import { test } from "node:test";
import assert from "node:assert/strict";
import { invalidatesSession } from "../src/features/auth/session-errors.ts";
import { ApiError, createApiClient } from "../src/lib/api/client.ts";

test("permiso y Origin rechazados conservan sesión; suspensión y 401 la invalidan", () => {
  for (const code of ["Forbidden", "AuthError", "OriginRejected"]) {
    assert.equal(invalidatesSession(new ApiError({ statusCode: 403, error: code, mensaje: "denegado" })), false);
  }
  assert.equal(invalidatesSession(new ApiError({ statusCode: 403, error: "AccountSuspended", mensaje: "suspendida" })), true);
  assert.equal(invalidatesSession(new ApiError({ statusCode: 401, error: "Unauthorized", mensaje: "sesión vencida" })), true);
  assert.equal(invalidatesSession(new Error("network")), false);
});

test("el cliente conserva el código de suspensión del BFF", async () => {
  const api = createApiClient("/api", async () => Response.json({ message: "Suspendida", error: "AccountSuspended" }, { status: 403 }));
  await assert.rejects(api("/test"), (error: unknown) => invalidatesSession(error));
});
