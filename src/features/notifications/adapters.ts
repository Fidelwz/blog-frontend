import { record, text, contentId } from '../publications/adapters.ts';
export const notificationLabels = { comment:'Comentario', reply:'Respuesta', group_post:'Publicación del grupo', report_result:'Resultado del reporte', content_removed:'Contenido retirado', new_report:'Nuevo reporte' } as const;
export type NotificationType = keyof typeof notificationLabels;
export function notificationHref(value: unknown): string | null {
  if (value === null) return null;
  const path = text(value);
  if (path === '/moderation' || path === '/moderacion') return '/moderacion';
  const post = /^\/(?:posts|publicaciones)\/([1-9]\d*)$/.exec(path);
  if (post) return `/publicaciones/${contentId(post[1])}`;
  const group = /^\/(?:groups\/([1-9]\d*)\/moderation|grupos\/([1-9]\d*)\/moderacion)$/.exec(path);
  if (group) return `/grupos/${contentId(group[1] ?? group[2])}/moderacion`;
  throw new Error('Destino inválido');
}
export function newestNotificationId(items: {id:string}[]): string | null {
  return items.reduce<string|null>((latest,item) => latest === null || BigInt(item.id) > BigInt(latest) ? item.id : latest,null);
}
export function parseNotifications(value: unknown) {
  const page = record(value);
  if (!Array.isArray(page.items) || typeof page.unreadCount !== 'number' || !Number.isSafeInteger(page.unreadCount) || page.unreadCount < 0) throw new Error('Bandeja inválida');
  return { unreadCount:page.unreadCount,nextCursor:page.nextCursor === null ? null : contentId(page.nextCursor),items:page.items.map(value => {
    const n = record(value); if (!Object.hasOwn(notificationLabels,text(n.type))) throw new Error('Aviso inválido');
    const href = notificationHref(n.href);
    const createdAt = text(n.createdAt); if (!Number.isFinite(Date.parse(createdAt))) throw new Error('Fecha inválida');
    const readAt = n.readAt === null ? null : text(n.readAt); if (readAt && !Number.isFinite(Date.parse(readAt))) throw new Error('Fecha inválida');
    return { id:contentId(n.id),type:text(n.type) as NotificationType,message:text(n.message),href,createdAt,readAt };
  }) };
}
