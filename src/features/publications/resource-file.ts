export const MAX_RESOURCE_BYTES = 4 * 1024 * 1024;
export function resourceFileError(file: Pick<File, 'size' | 'type'>, type: 'image' | 'document') {
  if (!file.size || file.size > MAX_RESOURCE_BYTES) return 'Selecciona un archivo de hasta 4 MB.';
  if (!(type === 'image' ? ['image/png','image/jpeg'] : ['application/pdf']).includes(file.type)) return type === 'image' ? 'Usa una imagen JPG o PNG.' : 'Usa un documento PDF.';
  return null;
}
export async function compressResourceImage(file: File): Promise<File> {
  if (file.size < 512 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1,Math.round(bitmap.width * scale)); canvas.height = Math.max(1,Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve,file.type,0.85));
    return blob && blob.size < file.size ? new File([blob],file.name,{ type: file.type }) : file;
  } finally { bitmap.close(); }
}
