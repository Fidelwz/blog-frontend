import "server-only";
import { ApiError } from "../../../lib/api/client.ts";
import { parseBackendAuthUser } from "./profile.ts";
import { SESSION_COOKIE, validCookieValue } from "./cookie.ts";
import { upstreamError } from "../../../lib/server/upstream-error.ts";
import { forwardedIdentity } from "../../../lib/server/forwarded-identity.ts";

export function authError(status: number, mensaje: string, code = "AuthError") {
  return new ApiError({ statusCode: status, error: code, mensaje });
}

export async function backendAuth(path: "login" | "me" | "logout", options: { cookie?: string; credentials?: { email: string; password: string } } = {}) {
  const configured = process.env.BACKEND_API_URL;
  if (!configured) throw authError(503, "El servicio de acceso todavía no está configurado.");
  let base: URL;
  try { base = new URL(configured); } catch { throw authError(503, "La configuración del servicio de acceso no es válida."); }
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw authError(503, "La configuración del servicio de acceso no es válida.");
  }
  const headers = new Headers({ Accept: "application/json" });
  const target = `${base.href.replace(/\/$/, "")}/auth/${path}`;
  const method = path === "me" ? "GET" : "POST";
  (await forwardedIdentity(target, method)).forEach((value, key) => headers.set(key, value));
  if (options.cookie && validCookieValue(options.cookie)) headers.set("Cookie", `${SESSION_COOKIE}=${options.cookie}`);
  if (options.credentials) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(target, {
      method, headers,
      body: options.credentials ? JSON.stringify(options.credentials) : undefined,
      cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw authError(504, "El servicio tardó demasiado en responder. Inténtalo de nuevo.");
    }
    throw authError(503, "No pudimos conectar con el servicio. Inténtalo de nuevo.");
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: "Revisa el correo y la contraseña ingresados.",
      401: path === "login" ? "El correo o la contraseña son incorrectos." : "Tu sesión ha vencido. Inicia sesión nuevamente.",
      403: "Tu cuenta está suspendida. Comunícate con el administrador.",
      429: "Demasiados intentos. Espera un momento antes de volver a intentar.",
    };
    const status = messages[response.status] ? response.status : 502;
    // Do not expose upstream HTML, stack traces, tokens, or redirects.
    throw await upstreamError(response, status, messages[status] ?? "El servicio de acceso no está disponible. Inténtalo de nuevo.", "AuthError");
  }
  if (response.status !== (path === "logout" ? 204 : 200)) throw authError(502, "El servicio devolvió una respuesta inesperada.");
  return response;
}

export async function backendUser(response: Response) {
  try {
    const user = parseBackendAuthUser(await response.json());
    if (user.status === "suspendido") throw authError(403, "Tu cuenta está suspendida. Comunícate con el administrador.", "AccountSuspended");
    return user;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw authError(502, "El servicio devolvió un perfil no válido. Inténtalo de nuevo.");
  }
}
