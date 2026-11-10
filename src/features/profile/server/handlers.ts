import "server-only";
import type { NextRequest } from "next/server";
import { accountBackend } from "../../auth/server/account-backend.ts";
import { authError } from "../../auth/server/backend.ts";
import { SESSION_COOKIE } from "../../auth/server/cookie.ts";
import { json, errorResponse, requireSameOrigin } from "../../auth/server/handlers.ts";
import { readJson } from "../../auth/server/request-body.ts";
import { readImageUpload } from "../../../lib/server/read-image-upload.ts";
import { PHOTO_SIZE_MESSAGE } from "../photo.ts";
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
    const { file } = await readImageUpload(request);
    const body = new FormData();
    body.set("file", file, file.type === "image/png" ? "perfil.png" : "perfil.jpg");
    return json(await readProfile(await accountBackend("/users/me/photo", { method: "PUT", cookie, body,
      messages: { 413: PHOTO_SIZE_MESSAGE, 415: "Solo JPG o PNG.", 502: "No pudimos guardar la imagen, inténtalo de nuevo." },
    })));
  } catch (error) { return errorResponse(error, true); }
}
