import { record, contentId, text } from '../publications/adapters.ts';
export function parseComment(value: unknown) {
  const c = record(value), author = record(c.author);
  if (!['visible','retenido','eliminado'].includes(text(c.status))) throw new Error('Estado inválido');
  const createdAt = text(c.createdAt); if (!Number.isFinite(Date.parse(createdAt))) throw new Error('Fecha inválida');
  const parent = c.parent === null ? null : record(c.parent);
  return { id: contentId(c.id), postId: contentId(c.postId), content: c.content === null ? null : text(c.content), status: text(c.status), createdAt,
    author: { id: contentId(author.id), name: text(author.name), lastName: text(author.lastName) },
    parent: parent ? { id: contentId(parent.id), content: parent.content === null ? null : text(parent.content) } : null,
  };
}
export function parseComments(value: unknown) {
  const page = record(value); if (!Array.isArray(page.items)) throw new Error('Página inválida');
  return { items: page.items.map(parseComment), nextCursor: page.nextCursor === null ? null : contentId(page.nextCursor) };
}
export type Comment = ReturnType<typeof parseComment>;
