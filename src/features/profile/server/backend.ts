import "server-only";
import { cookies } from "next/headers";
import { ApiError } from "../../../lib/api/client.ts";
import { accountBackend } from "../../auth/server/account-backend.ts";
import { authError } from "../../auth/server/backend.ts";
import { SESSION_COOKIE, validCookieValue } from "../../auth/server/cookie.ts";
import { parseBackendProfile } from "./profile.ts";

export function requireCookie(cookie: string | undefined) {
  if (!cookie || !validCookieValue(cookie)) throw authError(401, "Inicia sesión para continuar.");
  return cookie;
}
export async function readProfile(response: Response) {
  try {
    const profile = parseBackendProfile(await response.json());
    if (profile.status === "suspendido") throw authError(403, "Tu cuenta está suspendida. Comunícate con el administrador.");
    return profile;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw authError(502, "El servicio devolvió un perfil no válido. Inténtalo de nuevo.");
  }
}
export async function getMyProfile() {
  const cookie = requireCookie((await cookies()).get(SESSION_COOKIE)?.value);
  return readProfile(await accountBackend("/users/me", { cookie }));
}
