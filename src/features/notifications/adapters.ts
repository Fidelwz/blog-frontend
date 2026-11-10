import { record, text, contentId } from '../publications/adapters.ts';
const types = ['comentario','respuesta','publicacion_grupo','resultado_reporte','contenido_retirado','nuevo_reporte'];
export function parseNotifications(value: unknown) {
  const page = record(value);
  if (!Array.isArray(page.items) || typeof page.unreadCount !== 'number' || !Number.isSafeInteger(page.unreadCount) || page.unreadCount < 0) throw new Error('Bandeja inválida');
  return { unreadCount:page.unreadCount,nextCursor:page.nextCursor === null ? null : contentId(page.nextCursor),items:page.items.map(value => {
    const n = record(value); if (!types.includes(text(n.type))) throw new Error('Aviso inválido');
    const href = n.href === null ? null : text(n.href);
    if (href && !/^\/(?:publicaciones\/[1-9]\d*|moderacion(?:\/reportes\/[1-9]\d*)?)$/.test(href)) throw new Error('Destino inválido');
    const createdAt = text(n.createdAt); if (!Number.isFinite(Date.parse(createdAt))) throw new Error('Fecha inválida');
    const readAt = n.readAt === null ? null : text(n.readAt); if (readAt && !Number.isFinite(Date.parse(readAt))) throw new Error('Fecha inválida');
    return { id:contentId(n.id),type:text(n.type),message:text(n.message),href,createdAt,readAt };
  }) };
}
