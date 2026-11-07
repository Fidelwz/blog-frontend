// Leave room for multipart headers below Vercel's 4.5 MB request limit.
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const PHOTO_SIZE_MESSAGE = "La imagen no puede superar 4 MB.";
export function photoError(file: { size: number; type: string }): { status: number; message: string } | null {
  if (file.size > MAX_PHOTO_BYTES) return { status: 413, message: PHOTO_SIZE_MESSAGE };
  if (!["image/jpeg", "image/png"].includes(file.type)) return { status: 415, message: "Solo JPG o PNG." };
  if (file.size === 0) return { status: 400, message: "Selecciona una imagen que no esté vacía." };
  return null;
}
