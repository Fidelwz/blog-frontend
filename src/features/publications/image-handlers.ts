import "server-only";
import type { NextRequest } from "next/server";
import { backendFetch } from "../../lib/server/backend-fetch.ts";
import { readImageUpload } from "../../lib/server/read-image-upload.ts";
import { authError } from "../auth/server/backend.ts";
import { requireCookie } from "../profile/server/backend.ts";
import { SESSION_COOKIE } from "../auth/server/cookie.ts";
import { json, errorResponse, requireSameOrigin } from "../auth/server/handlers.ts";
import { contentId, parseAttachment, parsePost } from "./adapters.ts";

type Context = { params: Promise<{ id: string; attachmentId?: string }> };
async function mutate(request: NextRequest, context: Context, method: "POST" | "DELETE") {
  try {
    requireSameOrigin(request);
    const cookie = requireCookie(request.cookies.get(SESSION_COOKIE)?.value);
    const params = await context.params;
    let id: string, attachmentId: string | undefined;
    try { id = contentId(params.id); if (method === "DELETE") attachmentId = contentId(params.attachmentId); }
    catch { throw authError(400, "Identificador inválido."); }
    const post = parsePost(await (await backendFetch(`/posts/${id}`, { cookie })).json());
    // Private storage and membership revocation are separate, pending work (A02).
    if (post.groupId !== null) throw authError(403, "La gestión de imágenes de grupos todavía no está disponible.");
    if (method === "DELETE") {
      await backendFetch(`/posts/${id}/attachments/${attachmentId}`, { method, cookie, expected: 204 });
      return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
    }
    const { file, data } = await readImageUpload(request, ["title"]);
    const title = data.get("title");
    if (typeof title !== "string" || title.trim().length < 1 || title.trim().length > 150) throw authError(400, "Describe la imagen con un título de 1 a 150 caracteres.");
    const body = new FormData();
    body.set("type", "image"); body.set("title", title.trim());
    body.set("file", file, file.type === "image/png" ? "publicacion.png" : "publicacion.jpg");
    const response = await backendFetch(`/posts/${id}/attachments`, { method, body, cookie, expected: 201 });
    return json(parseAttachment(await response.json()), 201);
  } catch (error) { return errorResponse(error, true); }
}
export const addImage = (request: NextRequest, context: Context) => mutate(request, context, "POST");
export const removeImage = (request: NextRequest, context: Context) => mutate(request, context, "DELETE");
