import "server-only";
import { authError } from "../../features/auth/server/backend.ts";
import { readBody } from "../../features/auth/server/request-body.ts";
import { MAX_PHOTO_BYTES, PHOTO_SIZE_MESSAGE, photoError } from "../../features/profile/photo.ts";
import { ApiError } from "../api/client.ts";

export async function readImageUpload(request: Request, fields: readonly string[] = []) {
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
  for (const key of data.keys()) {
    if (!["file", ...fields].includes(key) || data.getAll(key).length !== 1) throw authError(400, "Envía una sola imagen y los campos permitidos.");
  }
  const file = data.get("file");
  if (!(file instanceof File)) throw authError(400, "Envía una imagen en el campo file.");
  const invalid = photoError(file);
  if (invalid) throw authError(invalid.status, invalid.message);
  return { file, data };
}
