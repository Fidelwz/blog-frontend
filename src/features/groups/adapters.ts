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
export const groupRoles = { member: 'Miembro', moderator: 'Moderador', administrator: 'Administrador' };
export type Group = ReturnType<typeof parseGroup>;
export function parseMembers(value: unknown) {
  const page = record(value);
  if (!Array.isArray(page.items)) throw new Error('Listado inválido');
  return { nextCursor: page.nextCursor === null ? null : contentId(page.nextCursor), items: page.items.map(value => {
    const member = record(value), user = record(member.user);
    const role = text(member.role);
    if (!Object.hasOwn(groupRoles, role)) throw new Error('Rol inválido');
    const joinedAt = text(member.joinedAt);
    if (!Number.isFinite(Date.parse(joinedAt))) throw new Error('Fecha inválida');
    return { role: role as keyof typeof groupRoles, joinedAt, user: {
      id: contentId(user.userId), name: text(user.name), lastName: text(user.lastName),
      major: user.major == null ? null : text(user.major),
    } };
  }) };
}
export type Member = ReturnType<typeof parseMembers>['items'][number];
