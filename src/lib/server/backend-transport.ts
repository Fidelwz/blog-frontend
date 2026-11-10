import { ApiError } from "../api/client.ts";
import { upstreamError } from "./upstream-error.ts";
import { validCookieValue, SESSION_COOKIE } from "../../features/auth/server/cookie.ts";

export interface BackendOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  cookie?: string;
  body?: Record<string, unknown> | FormData;
  expected?: number;
  publicCache?: boolean;
  signal?: AbortSignal;
  identityHeaders?: Headers;
  operation?: { key?: string; ownerId: string };
}
const messages: Record<number, string> = {
  400: "Revisa los datos ingresados.", 401: "Inicia sesión para continuar.",
  403: "No tienes permiso para realizar esta operación.", 404: "El contenido no existe.",
  409: "El contenido cambió. Revisa la versión actual antes de guardar.",
  410: "El enlace ha vencido.", 413: "La solicitud es demasiado grande.",
  415: "El formato no es compatible.", 429: "Demasiados intentos. Vuelve a intentarlo más tarde.",
  502: "El servicio devolvió una respuesta inesperada.", 503: "No pudimos conectar con el servicio.",
  504: "El servicio tardó demasiado en responder.",
};
const failure = (status: number, code = "UpstreamError") => new ApiError({ statusCode: status, error: code, mensaje: messages[status] });

export async function transportBackend(configured: string | undefined, path: string, options: BackendOptions = {}, transport: typeof fetch = fetch): Promise<Response> {
  let base: URL;
  try { base = new URL(configured ?? ""); } catch { throw failure(503); }
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw failure(503);
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\r\n#]/.test(path) || path.split("?")[0].split("/").includes("..")) throw failure(400);
  if (options.publicCache && (options.cookie || options.body || options.identityHeaders || options.operation || (options.method && options.method !== "GET"))) throw failure(400);
  const headers = new Headers({ Accept: "application/json" });
  if (options.operation) {
    if (!options.cookie || !/^[1-9]\d{0,18}$/.test(options.operation.ownerId) ||
        (options.operation.key !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(options.operation.key))) throw failure(400);
    headers.set("X-Post-Owner", options.operation.ownerId);
    if (options.operation.key) headers.set("Idempotency-Key", options.operation.key);
  }
  for (const key of ["x-blog-client-ip", "x-blog-client-time", "x-blog-client-signature"]) {
    const value = options.identityHeaders?.get(key);
    if (value) headers.set(key, value);
  }
  if (options.cookie) {
    if (!validCookieValue(options.cookie)) throw failure(401, "Unauthorized");
    headers.set("Cookie", `${SESSION_COOKIE}=${options.cookie}`);
  }
  const multipart = options.body instanceof FormData;
  if (options.body && !multipart) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await transport(`${base.href.replace(/\/$/, "")}${path}`, {
      method: options.method ?? "GET", headers,
      body: multipart ? options.body as FormData : options.body ? JSON.stringify(options.body) : undefined,
      redirect: "manual", cache: options.publicCache ? "force-cache" : "no-store",
      ...(options.publicCache ? { next: { revalidate: 3600 } } : {}),
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw failure(error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? 504 : 503);
  }
  if (response.status === (options.expected ?? 200)) return response;
  const status = !response.ok && messages[response.status] ? response.status : 502;
  throw await upstreamError(response, status, messages[status]);
}
