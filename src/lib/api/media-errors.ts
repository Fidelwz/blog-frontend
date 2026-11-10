import { ApiError } from "./client.ts";

/** Only recognized codes are exposed; provider messages may contain credentials. */
export function mediaError(status: number, body: unknown): ApiError | undefined {
  if (!body || typeof body !== "object") return;
  const code = Reflect.get(body, "error");
  if (status === 503 && code === "MediaStorageNotConfigured") return new ApiError({
    statusCode: status, error: code,
    mensaje: "El servicio de imágenes todavía no está configurado. Contacta al administrador.",
  });
  if (status === 502 && code === "MediaStorageUnavailable") return new ApiError({
    statusCode: status, error: code,
    mensaje: "El servicio de imágenes no pudo guardar el archivo. Inténtalo de nuevo más tarde.",
  });
}
