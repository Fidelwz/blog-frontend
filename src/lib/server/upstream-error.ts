import { ApiError } from "../api/client.ts";
import { mediaError } from "../api/media-errors.ts";

export async function upstreamError(response: Response, status: number, message: string, defaultCode = "UpstreamError") {
  let body: unknown;
  try { body = await response.json(); } catch { /* Ignore provider HTML and internal details. */ }
  const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const media = mediaError(response.status, body);
  let code = media?.code ?? defaultCode;
  if (status === 401) code = "Unauthorized";
  if (status === 403) code = value.error === "AccountSuspended" || value.message === "The account is suspended" ? "AccountSuspended" : "Forbidden";
  if (status === 409) code = "Conflict";
  if (status === 409 && value.error === "OperationKeyConflict") code = "OperationKeyConflict";
  if (status === 403 && value.error === "OperationOwnerChanged") code = "OperationOwnerChanged";
  if (status === 429) code = "RateLimited";
  const correlation = response.headers.get("x-request-id");
  const retry = response.headers.get("retry-after");
  return new ApiError({
    statusCode: media?.status ?? status, error: code,
    mensaje: media?.message ?? (status === 403 && code !== "AccountSuspended" ? "No tienes permiso para realizar esta operación." : message),
    idCorrelacion: correlation && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(correlation) ? correlation : undefined,
    retryAfter: status === 429 && retry && /^\d{1,5}$/.test(retry) && Number(retry) >= 1 && Number(retry) <= 3600 ? Number(retry) : undefined,
  });
}
