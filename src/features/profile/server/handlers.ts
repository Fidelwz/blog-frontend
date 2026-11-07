import "server-only";
import type { NextRequest } from "next/server";
import { accountBackend } from "../../auth/server/account-backend.ts";
import { authError } from "../../auth/server/backend.ts";
import { SESSION_COOKIE } from "../../auth/server/cookie.ts";
import { json, errorResponse, requireSameOrigin } from "../../auth/server/handlers.ts";
import { readBody, readJson } from "../../auth/server/request-body.ts";
import { ApiError } from "../../../lib/api/client.ts";
import { MAX_PHOTO_BYTES, PHOTO_SIZE_MESSAGE, photoError } from "../photo.ts";
import { parseProfilePatch, profileFields } from "../validation.ts";
import { readProfile, requireCookie } from "./backend.ts";

export async function me(request: NextRequest) {
  try {
    const cookie = requireCookie(request.cookies.get(SESSION_COOKIE)?.value);
    return json(await readProfile(await accountBackend("/users/me", { cookie })));
  } catch (error) { return errorResponse(error, true); }
}
export async function updateProfile(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const cookie = requireCookie(request.cookies.get(SESSION_COOKIE)?.value);
    const raw = await readJson(request, profileFields);
    let body;
    try { body = parseProfilePatch(raw); } catch { throw authError(400, "Revisa los datos del perfil."); }
    return json(await readProfile(await accountBackend("/users/me", { method: "PATCH", cookie, body })));
  } catch (error) { return errorResponse(error, true); }
}

export async function uploadPhoto(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const cookie = requireCookie(request.cookies.get(SESSION_COOKIE)?.value);
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.split(";")[0].trim().toLowerCase() !== "multipart/form-data") throw authError(415, "Envía la imagen como archivo JPG o PNG.");
    let bytes;
    try { bytes = await readBody(request, MAX_PHOTO_BYTES + 65_536); }
    catch (error) {
      if (error instanceof ApiError && error.status === 413) throw authError(413, PHOTO_SIZE_MESSAGE);
      throw error;
    }
    let data: FormData;
    try { data = await new Response(new Uint8Array(bytes), { headers: { "Content-Type": contentType } }).formData(); }
    catch { throw authError(400, "No pudimos leer la imagen. Selecciona el archivo de nuevo."); }
    const entries = [...data.entries()];
    const file = data.get("file");
    if (entries.length !== 1 || entries[0][0] !== "file" || !(file instanceof File)) throw authError(400, "Envía una sola imagen en el campo file.");
    const invalid = photoError(file);
    if (invalid) throw authError(invalid.status, invalid.message);
    const body = new FormData();
    body.set("file", file, file.type === "image/png" ? "perfil.png" : "perfil.jpg");
    return json(await readProfile(await accountBackend("/users/me/photo", { method: "PUT", cookie, body,
      messages: { 413: PHOTO_SIZE_MESSAGE, 415: "Solo JPG o PNG.", 502: "No pudimos guardar la imagen, inténtalo de nuevo." },
    })));
  } catch (error) { return errorResponse(error, true); }
}
