import type { ApiErrorBody } from "./contracts.ts";

export class ApiError extends Error {
  readonly status: number;
  readonly correlationId?: string;
  readonly code?: string;
  readonly retryAfter?: number;
  constructor(body: ApiErrorBody) {
    super(body.mensaje);
    this.name = "ApiError";
    this.status = body.statusCode;
    this.correlationId = body.idCorrelacion;
    this.code = body.error;
    this.retryAfter = body.retryAfter;
  }
}

/** No reintenta mutaciones ni sustituye fallos del backend por datos ficticios. */
export function createApiClient(baseUrl: string, transport: typeof fetch = fetch) {
  return async function request<T>(path: string, init: RequestInit = {}): Promise<T | undefined> {
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
      throw new Error("La ruta de la API debe ser relativa al backend configurado.");
    }
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await transport(`${baseUrl.replace(/\/$/, "")}${path}`, {
      ...init, headers, credentials: "include", cache: "no-store",
    });
    if (!response.ok) {
      let body: Partial<ApiErrorBody> & { message?: unknown } = {};
      try { const parsed: unknown = await response.json(); if (parsed && typeof parsed === "object") body = parsed as typeof body; } catch { /* Proxy o servicio sin respuesta JSON. */ }
      const message = typeof body.message === "string" ? body.message
        : Array.isArray(body.message) ? body.message.filter((item): item is string => typeof item === "string").join(" ") : "";
      throw new ApiError({
        statusCode: response.status,
        error: typeof body.error === "string" ? body.error : "ApiError",
        mensaje: message || (typeof body.mensaje === "string" ? body.mensaje : "No pudimos completar la solicitud. Inténtalo de nuevo."),
        idCorrelacion: body.idCorrelacion,
        retryAfter: body.retryAfter,
      });
    }
    if (response.status === 204 || response.status === 205) return undefined;
    return await response.json() as T;
  };
}
