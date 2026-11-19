import { contentId, record, text } from '../publications/adapters.ts';

export const reportFilters = ['pendiente', 'desestimado', 'contenido_retirado', 'usuario_suspendido'] as const;
export type ReportFilter = typeof reportFilters[number];
export type ReportDecision = Exclude<ReportFilter, 'pendiente'>;
export const reportStatusLabels = {
  pending: 'Pendiente', dismissed: 'Desestimado', content_removed: 'Contenido retirado', user_suspended: 'Usuario suspendido',
} as const;
export type ReportStatus = keyof typeof reportStatusLabels;
function contentType(value: unknown): 'post' | 'comment' {
  if (value !== 'post' && value !== 'comment') throw new Error('Tipo inválido');
  return value;
}
export function parseReport(value: unknown) {
  const row = record(value);
  const status = text(row.status);
  if (!Object.hasOwn(reportStatusLabels, status)) throw new Error('Estado de reporte inválido');
  const contentStatus = row.contentStatus;
  if (contentStatus !== 'visible' && contentStatus !== 'retained' && contentStatus !== 'deleted') throw new Error('Estado de contenido inválido');
  return {
    id: contentId(row.id), type: contentType(row.type), title: text(row.title), content: text(row.content),
    reason: text(row.reason), status: status as ReportStatus, contentStatus,
    postId: contentId(row.postId), targetId: contentId(row.targetId), groupId: row.groupId === null ? null : contentId(row.groupId),
    observation: row.observation === null ? null : text(row.observation), createdAt: text(row.createdAt), version: null,
  };
}
export function parseRetained(value: unknown) {
  const row = record(value), type = contentType(row.type);
  if (type === 'post' && (typeof row.version !== 'number' || !Number.isSafeInteger(row.version) || row.version < 1)) throw new Error('Versión inválida');
  return { id: contentId(row.id), postId: contentId(row.postId), type, title: text(row.title), content: text(row.content),
    status: 'retained' as const, reason: null, version: type === 'post' ? row.version as number : null };
}
export function parseModerationPage(value: unknown, kind: 'report' | 'retained') {
  const page = record(value);
  if (!Array.isArray(page.items)) throw new Error('Página inválida');
  return { items: page.items.map(item => kind === 'report' ? parseReport(item) : parseRetained(item)), nextCursor: page.nextCursor === null ? null : contentId(page.nextCursor) };
}
