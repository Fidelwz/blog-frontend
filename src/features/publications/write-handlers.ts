import "server-only";
import type { NextRequest } from "next/server";
import { backendFetch } from "../../lib/server/backend-fetch.ts";
import { authError } from "../auth/server/backend.ts";
import { json, errorResponse, requireSameOrigin } from "../auth/server/handlers.ts";
import { readJson } from "../auth/server/request-body.ts";
import { SESSION_COOKIE, validCookieValue } from "../auth/server/cookie.ts";
import { contentId, parsePost } from "./adapters.ts";
import { operationKey, parseReceipt } from "./operations.ts";

type Context = { params: Promise<{ id: string }> };
async function write(request: NextRequest, method: "POST" | "PATCH" | "DELETE", rawId?: string) {
  try {
    requireSameOrigin(request);
    const cookie = request.cookies.get(SESSION_COOKIE)?.value;
    if (!cookie || !validCookieValue(cookie)) throw authError(401, "Inicia sesión para continuar.");
    let operation: { key: string; ownerId: string } | undefined;
    if (request.headers.has("idempotency-key")) {
      try { operation = { key: operationKey(request.headers.get("idempotency-key")), ownerId: contentId(request.headers.get("x-post-owner")) }; }
      catch { throw authError(400, "No pudimos identificar este guardado. Recarga el formulario."); }
    }
    let id: string | undefined;
    try { id = rawId === undefined ? undefined : contentId(rawId); } catch { throw authError(400, "Identificador inválido."); }
    let body: Record<string, unknown> | undefined;
    if (method !== "DELETE") {
      body = await readJson(request, method === "POST" ? ["title", "content", "categoryId"] : ["title", "content", "categoryId", "version"], 256 * 1024);
      if ((method === "POST" || body.title !== undefined) && (typeof body.title !== "string" || body.title.trim().length < 3 || body.title.trim().length > 150)) throw authError(400, "El título debe tener entre 3 y 150 caracteres.");
      if ((method === "POST" || body.content !== undefined) && (typeof body.content !== "string" || !body.content.trim() || body.content.length > 20000)) throw authError(400, "El contenido debe tener entre 1 y 20 000 caracteres de HTML.");
      if ((method === "POST" || body.categoryId !== undefined) && (typeof body.categoryId !== "number" || !Number.isSafeInteger(body.categoryId) || body.categoryId <= 0)) throw authError(400, "Selecciona una materia válida.");
      if (method === "PATCH" && (typeof body.version !== "number" || !Number.isSafeInteger(body.version) || body.version < 1)) throw authError(400, "Falta la versión actual de la publicación.");
    }
    const response = await backendFetch(id ? `/posts/${id}` : "/posts", { method, body, cookie, operation, expected: method === "POST" ? 201 : method === "DELETE" ? 204 : 200 });
    if (method === "DELETE") return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
    const result: unknown = await response.json();
    return json(operation ? parseReceipt(result) : parsePost(result), method === "POST" ? 201 : 200);
  } catch (error) {
    // An old in-flight operation must not expire a cookie installed by a newer
    // login in another tab. The owning editor invalidates its session cache.
    return errorResponse(error, !request.headers.has("idempotency-key"));
  }
}
export const createPost = (request: NextRequest) => write(request, "POST");
export const updatePost = async (request: NextRequest, context: Context) => write(request, "PATCH", (await context.params).id);
export const deletePost = async (request: NextRequest, context: Context) => write(request, "DELETE", (await context.params).id);

export async function readOperation(request: NextRequest, context: { params: Promise<{ key: string }> }) {
  try {
    const cookie = request.cookies.get(SESSION_COOKIE)?.value;
    if (!cookie || !validCookieValue(cookie)) throw authError(401, "Inicia sesión para continuar.");
    let key: string, ownerId: string;
    try { key = operationKey((await context.params).key); ownerId = contentId(request.headers.get("x-post-owner")); }
    catch { throw authError(400, "Identificador de guardado inválido."); }
    return json(parseReceipt(await (await backendFetch(`/posts/operations/${key}`, { cookie, operation: { ownerId } })).json()));
  } catch (error) { return errorResponse(error); }
}
