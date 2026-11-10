import { contentId, record, text } from '../publications/adapters.ts';
export function parseGroup(value: unknown) {
  const g = record(value), category = record(g.category), count = record(g._count);
  if (g.myRole !== null && !['member', 'moderator', 'administrator'].includes(text(g.myRole))) throw new Error('Rol inválido');
  if (typeof count.members !== 'number' || !Number.isSafeInteger(count.members) || count.members < 0) throw new Error('Contador inválido');
  return { id: contentId(g.groupId), name: text(g.name), description: g.description === null ? null : text(g.description), category: { id: contentId(category.categoryId), name: text(category.name) }, myRole: g.myRole as 'member' | 'moderator' | 'administrator' | null, members: count.members };
}
export function parseGroups(value: unknown) {
  const page = record(value);
  if (!Array.isArray(page.items)) throw new Error('Listado inválido');
  return { items: page.items.map(parseGroup), nextCursor: page.nextCursor === null ? null : contentId(page.nextCursor) };
}
