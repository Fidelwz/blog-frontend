import "server-only";
import { authError } from "./backend.ts";
import { SESSION_COOKIE, validCookieValue } from "./cookie.ts";
import { upstreamError } from "../../../lib/server/upstream-error.ts";
import { forwardedIdentity } from "../../../lib/server/forwarded-identity.ts";

// Temporary transport for account/profile endpoints. Keep backendAuth's session contract intact.
export async function accountBackend(path: string, options: {
  method?: "GET" | "POST" | "PATCH" | "PUT";
  cookie?: string;
  body?: Record<string, unknown> | FormData;
  expectedStatus?: number;
  messages?: Record<number, string>;
} = {}) {
  const configured = process.env.BACKEND_API_URL;
  if (!configured) throw authError(503, "El servicio todavía no está configurado.");
  let base: URL;
  try { base = new URL(configured); } catch { throw authError(503, "La configuración del servicio no es válida."); }
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw authError(503, "La configuración del servicio no es válida.");
  }
  const headers = new Headers({ Accept: "application/json" });
  const target = `${base.href.replace(/\/$/, "")}${path}`;
  (await forwardedIdentity(target, options.method ?? "GET")).forEach((value, key) => headers.set(key, value));
  if (options.cookie && validCookieValue(options.cookie)) headers.set("Cookie", `${SESSION_COOKIE}=${options.cookie}`);
  const multipart = options.body instanceof FormData;
  if (options.body && !multipart) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(target, {
      method: options.method ?? "GET", headers,
      body: multipart ? options.body as FormData : options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) {
      throw authError(504, "El servicio tardó demasiado en responder. Inténtalo de nuevo.");
    }
    throw authError(503, "No pudimos conectar con el servicio. Inténtalo de nuevo.");
  }
  if (response.status !== (options.expectedStatus ?? 200)) {
    const messages: Record<number, string> = {
      400: "Revisa los datos ingresados.",
      401: "Tu sesión ha vencido. Inicia sesión nuevamente.",
      403: "Tu cuenta está suspendida. Comunícate con el administrador.",
      429: "Demasiados intentos. Espera un momento antes de volver a intentar.",
      ...options.messages,
    };
    const status = !response.ok && messages[response.status] ? response.status : 502;
    // Never return upstream bodies, redirects, cookies or tokens to the browser.
    throw await upstreamError(response, status, messages[status] ?? "No pudimos completar la solicitud. Inténtalo de nuevo.", "AuthError");
  }
  return response;
}
