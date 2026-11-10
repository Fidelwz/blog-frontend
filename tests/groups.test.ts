import assert from 'node:assert/strict';
import test from 'node:test';
import { parseGroup, parseGroups } from '../src/features/groups/adapters.ts';
const group = { groupId: '9223372036854775807', name: 'Álgebra', description: null, category: { categoryId: '1', name: 'Matemáticas' }, myRole: null, _count: { members: 1 }, email: 'private@example.test' };
test('grupos preserva bigint y excluye datos fuera del contrato', () => {
  const parsed = parseGroup(group);
  assert.equal(parsed.id, group.groupId);
  assert.equal(parsed.myRole, null);
  assert.equal('email' in parsed, false);
  assert.equal(parsed.description, null);
});
test('grupos rechaza IDs imprecisos, roles desconocidos y contadores inválidos', () => {
  for (const patch of [{ groupId: 123 }, { groupId: '9223372036854775808' }, { myRole: 'owner' }, { _count: { members: -1 } }]) assert.throws(() => parseGroup({ ...group, ...patch }));
});
test('paginación de grupos valida cursor y no inventa páginas', () => {
  assert.deepEqual(parseGroups({ items: [], nextCursor: null }), { items: [], nextCursor: null });
  assert.equal(parseGroups({ items: [group], nextCursor: '9' }).nextCursor, '9');
  assert.throws(() => parseGroups({ items: [group], nextCursor: 9 }));
});
