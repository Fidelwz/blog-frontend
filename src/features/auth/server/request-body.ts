import "server-only";
import { authError } from "./backend.ts";

export async function readBody(request: Request, maximum = 8192) {
  const reader = request.body?.getReader();
  if (!reader) throw authError(400, "La solicitud está vacía.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximum) { await reader.cancel(); throw authError(413, "La solicitud es demasiado grande."); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function readJson(request: Request, allowed: readonly string[]) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw authError(415, "La solicitud debe enviarse en formato JSON.");
  }
  const bytes = await readBody(request);
  let value: unknown;
  try { value = JSON.parse(bytes.toString("utf8")); } catch { throw authError(400, "La solicitud no contiene JSON válido."); }
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key))) {
    throw authError(400, "Revisa los datos ingresados.");
  }
  return value as Record<string, unknown>;
}
