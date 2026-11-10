import { test } from "node:test";
import assert from "node:assert/strict";
import { contentId, parsePost, parsePostPage, parseMyPostPage } from "../src/features/publications/adapters.ts";
import { parseCategories } from "../src/features/categories/adapters.ts";
import { parseFeedQuery, parseMyPostsQuery } from "../src/features/publications/validation.ts";
import { safeContent, excerpt } from "../src/features/publications/sanitize.ts";
import { transportBackend } from "../src/lib/server/backend-transport.ts";
import { ApiError } from "../src/lib/api/client.ts";
import { mediaError } from "../src/lib/api/media-errors.ts";
import { textToHtml, hasRichFormatting, htmlToText } from "../src/features/publications/editor.ts";

const post = {
  id: "1", authorId: "2", categoryId: "3", groupId: null, title: "Matrices", content: "<p>Álgebra</p>",
  status: "visible", version: 1, createdAt: "2026-11-08T00:00:00Z", updatedAt: null,
  author: { id: "2", firstName: "Ana", lastName: "Prueba", photoUrl: null, email: "private@example.test" },
  category: { id: "3", name: "Matemáticas" }, commentCount: 0,
  attachments: [{ id: "4", type: "link", title: "Recurso", url: "https://example.test/", order: 1, cloudinaryPublicId: "private" }],
};

test("publicaciones propias adaptan held, postId y contadores sin campos internos", () => {
  const own = { ...post, postId: "9", status: "held", category: { categoryId: "3", name: "Materia" }, _count: { comments: 2, attachments: 1 }, search_vector: "private", internal: true };
  const result = parseMyPostPage({ items: [own], nextCursor: "9" });
  assert.equal(result.siguienteCursor, "9");
  assert.equal(result.elementos[0].id, "9");
  assert.equal(result.elementos[0].status, "retenido");
  assert.equal(result.elementos[0].commentCount, 2);
  assert.equal(Object.hasOwn(result.elementos[0], "search_vector"), false);
  assert.equal(Object.hasOwn(result.elementos[0], "internal"), false);
  assert.throws(() => parseMyPostPage({ items: [{ ...own, status: "retained" }], nextCursor: null }));
});
test("consulta privada admite estados de Nest y cursor, nunca limit o identidad", () => {
  assert.equal(parseMyPostsQuery(new URLSearchParams("status=held&cursor=9")).toString(), "status=held&cursor=9");
  for (const query of ["status=retenido", "status=visible&status=held", "limit=20", "authorId=1", "cursor=-1"]) assert.throws(() => parseMyPostsQuery(new URLSearchParams(query)));
});

test("editor escapa HTML y reconoce formato que debe conservarse", () => {
  const html = textToHtml('<script>alert("x")</script>\n\nOtra línea & más');
  assert.equal(html.includes("<script>"), false);
  assert.equal(hasRichFormatting(html), false);
  assert.equal(htmlToText(html), '<script>alert("x")</script>\n\nOtra línea & más');
  assert.equal(hasRichFormatting('<p><strong>Formato</strong></p>'), true);
  assert.equal(hasRichFormatting('<p style="color:red">Formato</p>'), true);
  assert.equal(textToHtml("&".repeat(5000)).length > 20000, true);
});

test("contrato conserva fecha nullable y excluye correo y datos del proveedor", () => {
  const result = parsePost(post);
  assert.equal(result.updatedAt, null);
  assert.equal(Object.hasOwn(result.author, "email"), false);
  assert.equal(Object.hasOwn(result.attachments[0], "cloudinaryPublicId"), false);
  assert.equal(parsePost({ ...post, status: "retained" }).status, "retenido");
  assert.throws(() => parsePost({ ...post, status: "new" }));
  assert.throws(() => parsePost({ ...post, updatedAt: undefined }));
  assert.throws(() => parsePost({ ...post, attachments: [{ ...post.attachments[0], url: "javascript:alert(1)" }] }));
  assert.equal(parsePostPage({ items: [post], nextCursor: null }).elementos.length, 1);
});
test("IDs preservan bigint y categorías se adaptan desde categoryId", () => {
  assert.equal(contentId("9223372036854775807"), "9223372036854775807");
  for (const value of [1, "01", "0", "-1", "1e2", "9223372036854775808", "1\n"]) assert.throws(() => contentId(value));
  assert.deepEqual(parseCategories([{ categoryId: "1", name: "Álgebra", description: null, internal: true }]), [{ id: "1", name: "Álgebra", description: null }]);
});
test("filtros validan mínimos, límites, duplicados y precisión de categoría", () => {
  assert.equal(parseFeedQuery(new URLSearchParams("q=matrices&limit=2")).get("q"), "matrices");
  for (const value of ["q=a", "limit=51", "q=ab&q=cd", "categoryId=9007199254740992", "cursor=bad", "other=1"]) assert.throws(() => parseFeedQuery(new URLSearchParams(value)));
});
test("HTML del detalle elimina scripts, handlers y URLs ejecutables", () => {
  const result = safeContent('<p onclick="evil()">Hola</p><script>evil()</script><a href="javascript:evil()">enlace</a><strong>seguro</strong>');
  assert.equal(result.includes("evil"), false);
  assert.equal(result.includes("<strong>seguro</strong>"), true);
  assert.equal(excerpt("<script>evil()</script><p>Texto &amp; más</p>"), "Texto & más");
});
test("transporte admite DELETE 204 sin cookies en lecturas públicas ni reintentos", async () => {
  let calls = 0;
  const upstream: typeof fetch = async (_url, init) => {
    calls++;
    assert.equal(init?.method, "DELETE");
    assert.equal(new Headers(init?.headers).has("Cookie"), false);
    assert.equal(init?.redirect, "manual");
    return new Response(null, { status: 204 });
  };
  assert.equal((await transportBackend("https://backend.example.test/api/v1", "/posts/1", { method: "DELETE", expected: 204 }, upstream)).status, 204);
  assert.equal(calls, 1);
});
test("transporte distingue permiso, suspensión y redirect sin filtrar el cuerpo", async () => {
  for (const [message, code] of [["Group membership is required", "Forbidden"], ["The account is suspended", "AccountSuspended"]]) {
    await assert.rejects(transportBackend("https://backend.example.test/api/v1", "/posts/1", {}, async () => Response.json({ message, token: "private" }, { status: 403 })), (e: unknown) => e instanceof ApiError && e.code === code && !e.message.includes("private"));
  }
  await assert.rejects(transportBackend("https://backend.example.test", "/posts", {}, async () => new Response(null, { status: 302 })), (e: unknown) => e instanceof ApiError && e.status === 502);
});
test("caché pública no admite identidad ni mutaciones", async () => {
  let called = false;
  const upstream: typeof fetch = async () => { called = true; return Response.json({}); };
  await assert.rejects(transportBackend("https://backend.example.test", "/categories", { publicCache: true, cookie: "a.b.c" }, upstream));
  await assert.rejects(transportBackend("https://backend.example.test", "/categories", { publicCache: true, method: "POST" }, upstream));
  assert.equal(called, false);
});

test("errores de imágenes diferencian falta de configuración sin filtrar datos del proveedor", async () => {
  const payload = { error: "MediaStorageNotConfigured", message: "private-provider-secret" };
  const error = mediaError(503, payload);
  assert.equal(error?.code, "MediaStorageNotConfigured");
  assert.equal(error?.message.includes("private-provider-secret"), false);
  assert.equal(mediaError(503, { error: "unknown", message: "private" }), undefined);
  await assert.rejects(transportBackend("http://localhost:2000/api/v1", "/posts/1/attachments", {}, async () => Response.json(payload, { status: 503 })), (e: unknown) => e instanceof ApiError && e.status === 503 && e.code === "MediaStorageNotConfigured");
});
