import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../src/lib/api/client.ts";
import { createPublicationWriter, newPostOperation, parseReceipt, uncertainWrite } from "../src/features/publications/operations.ts";
import { transportBackend } from "../src/lib/server/backend-transport.ts";
import { createQueryClient } from "../src/lib/query/client.ts";
import { retainEditorDocument, hasEditorDocument } from "../src/features/auth/editor-session.ts";

test("respuesta perdida conserva clave, cuenta y cuerpo exactos al reintentar; no hay reintento automático", async () => {
  const body = { title: "Borrador original", content: "<p>Texto</p>", categoryId: 1 };
  const operation = newPostOperation("42", "POST", body);
  body.title = "Cambio posterior";
  const calls: RequestInit[] = [];
  const receipt = { status: "confirmed", key: operation.key, method: "POST", postId: "90", version: 1 };
  const writer = createPublicationWriter(async (_url, init) => {
    calls.push(init!);
    if (calls.length === 1) throw new TypeError("Lost response after commit");
    return Response.json(receipt, { status: 201 });
  });
  await assert.rejects(writer.send(operation));
  assert.equal(calls.length, 1);
  assert.equal((await writer.send(operation)).postId, "90");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body, calls[1].body);
  assert.equal(JSON.parse(calls[1].body as string).title, "Borrador original");
  for (const call of calls) {
    const headers = new Headers(call.headers);
    assert.equal(headers.get("Idempotency-Key"), operation.key);
    assert.equal(headers.get("X-Post-Owner"), "42");
    assert.equal(call.credentials, "include");
    assert.equal(call.cache, "no-store");
  }
});

test("comprobar resultado desconocido solo consulta; recibo antiguo conserva su versión", async () => {
  const operation = newPostOperation("42", "PATCH", { version: 1, title: "Título" }, "90");
  let calls = 0;
  const writer = createPublicationWriter(async (url, init) => {
    calls++;
    assert.equal(url, `/api/posts/operations/${operation.key}`);
    assert.equal(init?.method, undefined);
    assert.equal(init?.body, undefined);
    assert.equal(new Headers(init?.headers).get("X-Post-Owner"), "42");
    return Response.json(calls === 1 ? { status: "unknown" } : { status: "confirmed", key: operation.key, method: "PATCH", postId: "90", version: 2 });
  });
  assert.deepEqual(await writer.reconcile(operation), { status: "unknown" });
  assert.equal(calls, 1);
  assert.deepEqual(await writer.reconcile(operation), { status: "confirmed", key: operation.key, method: "PATCH", postId: "90", version: 2 });
});

test("DELETE reconoce 204 y recupera recibo aunque la publicación ya no exista", async () => {
  const operation = newPostOperation("42", "DELETE", undefined, "90");
  const writer = createPublicationWriter(async (_url, init) => init?.method === "DELETE"
    ? new Response(null, { status: 204 })
    : Response.json({ status: "confirmed", key: operation.key, method: "DELETE", postId: "90", version: 3 }));
  assert.equal((await writer.send(operation)).postId, "90");
  assert.deepEqual(await writer.reconcile(operation), { status: "confirmed", key: operation.key, method: "DELETE", postId: "90", version: 3 });
});

test("respuesta de otra operación, otra publicación o método no confirma el guardado", async () => {
  const operation = newPostOperation("42", "PATCH", { version: 1 }, "90");
  const valid = { status: "confirmed", key: operation.key, method: "PATCH", postId: "90", version: 2 };
  for (const change of [{ key: crypto.randomUUID() }, { method: "POST" }, { postId: "91" }, { status: "unknown" }, { version: 0 }]) {
    const writer = createPublicationWriter(async () => Response.json({ ...valid, ...change }));
    await assert.rejects(writer.send(operation));
  }
  assert.deepEqual(parseReceipt({ ...valid, secret: "private", body: "draft" }), valid);
  assert.deepEqual(parseReceipt({ status: "unknown", secret: "private" }), { status: "unknown" });
});

test("un rechazo posterior no niega un guardado anterior cuya respuesta se perdió", () => {
  for (const status of [400, 401, 403, 404, 409, 410, 413, 415, 429]) {
    const error = new ApiError({ statusCode: status, error: "Test", mensaje: "Rechazo" });
    assert.equal(uncertainWrite(error), false);
    assert.equal(uncertainWrite(error, true), true);
  }
  for (const error of [new Error("offline"), new DOMException("timeout", "TimeoutError"), new SyntaxError("invalid receipt"), new ApiError({ statusCode: 503, error: "Unavailable", mensaje: "error" })]) assert.equal(uncertainWrite(error), true);
});

test("BFF solo reenvía identificadores válidos con cookie y sin caché pública", async () => {
  const operation = newPostOperation("42", "POST", { title: "Ejemplo" });
  let calls = 0;
  const upstream: typeof fetch = async (_url, init) => {
    calls++;
    assert.equal(new Headers(init?.headers).get("Idempotency-Key"), operation.key);
    assert.equal(new Headers(init?.headers).get("X-Post-Owner"), "42");
    assert.equal(new Headers(init?.headers).get("Cookie"), "jwt=a.b.c");
    assert.equal(init?.cache, "no-store");
    return Response.json({});
  };
  const options = { cookie: "a.b.c", operation: { key: operation.key, ownerId: "42" } };
  await transportBackend("https://backend.example.test", "/posts", options, upstream);
  for (const invalid of [{ ...options, cookie: undefined }, { ...options, publicCache: true }, { ...options, operation: { key: "bad", ownerId: "42" } }, { ...options, operation: { key: operation.key, ownerId: "0" } }]) {
    await assert.rejects(transportBackend("https://backend.example.test", "/posts", invalid, upstream));
  }
  assert.equal(calls, 1);
});

test("cambio de cuenta y colisión de clave conservan códigos sin mensajes internos", async () => {
  for (const [status, code] of [[403, "OperationOwnerChanged"], [409, "OperationKeyConflict"]] as const) {
    await assert.rejects(transportBackend("https://backend.example.test", "/posts", {}, async () => Response.json({ error: code, message: "private" }, { status })), (e: unknown) => e instanceof ApiError && e.code === code && !e.message.includes("private"));
  }
});

test("retener un editor no afecta a otra pestaña/cliente ni se pierde al cerrar otro editor", () => {
  const first = createQueryClient(), second = createQueryClient();
  const closeA = retainEditorDocument(first), closeB = retainEditorDocument(first);
  assert.equal(hasEditorDocument(first), true);
  assert.equal(hasEditorDocument(second), false);
  closeA(); closeA();
  assert.equal(hasEditorDocument(first), true);
  closeB();
  assert.equal(hasEditorDocument(first), false);
  first.clear(); second.clear();
});
