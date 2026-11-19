import test from 'node:test';
import assert from 'node:assert/strict';
import { parseComment, parseComments } from '../src/features/comments/adapters.ts';
import { plainCommentText, commentQuery } from '../src/features/comments/validation.ts';
import { parseReport, parseModerationPage, reportStatusLabels } from '../src/features/moderation/adapters.ts';
import { conversationError } from '../src/features/comments/errors.ts';
import { ApiError } from '../src/lib/api/client.ts';

// Synthetic examples derived from commentDto/reportDto in Nest 39ebe974.
const comment = { id: '9007199254740993', postId: '9007199254740994', author: { id: '9007199254740995', firstName: 'Ana', lastName: 'Pérez' }, content: 'Una idea', status: 'visible', createdAt: '2026-11-18T12:00:00Z', parent: null };
test('comentarios mantienen IDs grandes, firstName y estados reales en ida y vuelta BFF', () => {
  for (const status of ['visible', 'retained', 'deleted']) {
    const parsed = parseComment({ ...comment, status });
    assert.equal(parsed.id, comment.id); assert.equal(parsed.author.firstName, 'Ana');
    assert.equal(parsed.status, status); assert.deepEqual(parseComment(parsed), parsed);
    assert.equal(parsed.content, status === 'deleted' ? null : 'Una idea');
  }
  assert.throws(() => parseComment({ ...comment, id: 9007199254740993 }));
  assert.throws(() => parseComment({ ...comment, status: 'retenido' }));
  assert.throws(() => parseComment({ ...comment, author: { id: '1', name: 'Ana', lastName: 'Pérez' } }));
});
test('página plana conserva respuesta cuyo padre no está cargado', () => {
  const page = parseComments({ items: [{ ...comment, parent: { id: '8', content: null } }], nextCursor: comment.id });
  assert.equal(page.items.length, 1); assert.deepEqual(page.items[0].parent, { id: '8', content: null });
  assert.equal(page.nextCursor, comment.id);
  assert.throws(() => parseComments({ items: [], page: 1 }));
});
test('cursor y limit admiten solo el contrato y no pierden precisión', () => {
  assert.equal(commentQuery(new URLSearchParams(`cursor=${comment.id}&limit=50`)).get('cursor'), comment.id);
  assert.equal(commentQuery(new URLSearchParams()).size, 0);
  for (const query of ['limit=0','limit=51','limit=1.5','limit=1&limit=2','cursor=0','page=1']) assert.throws(() => commentQuery(new URLSearchParams(query)));
});
test('validación mide texto sanitizado y normalizado como Nest', () => {
  assert.equal(plainCommentText(' <b>Hola &amp; adiós</b> ',1,2000), 'Hola & adiós');
  assert.equal(plainCommentText('<b>'+'a'.repeat(2000)+'</b>',1,2000).length,2000);
  for (const value of ['<script>private</script>','   ','a'.repeat(2001)]) assert.throws(() => plainCommentText(value,1,2000));
  assert.throws(() => plainCommentText('    a',5,500));
});
const report = { id: '9', type: 'comment', title: 'Publicación', content: 'Comentario', reason: 'Motivo válido', status: 'pending', contentStatus: 'visible', postId: '2', targetId: comment.id, groupId: null, observation: null, createdAt: comment.createdAt };
test('moderación distingue estados de respuesta en inglés de filtros/decisiones españoles', () => {
  for (const status of Object.keys(reportStatusLabels)) assert.equal(parseReport({ ...report, status }).status,status);
  assert.throws(() => parseReport({ ...report, status: 'pendiente' }));
  assert.equal(parseReport(report).targetId,comment.id);
  assert.equal(parseModerationPage({ items: [{ id:'1',type:'comment',postId:'2',title:'Título',content:'Retenido',version:null }],nextCursor:null },'retained').items[0].version,null);
});
test('errores conocidos son españoles y conservan referencia y espera sin trazas internas', () => {
  for (const statusCode of [400,401,403,404,409,429,500]) {
    const message = conversationError(new ApiError({ statusCode, error:'UpstreamError', mensaje:'private stack',idCorrelacion:'test-reference',retryAfter:statusCode===429?30:undefined }));
    assert.ok(message.includes('test-reference')); assert.ok(!message.includes('private stack'));
    if(statusCode===429) assert.ok(message.includes('30 segundos'));
  }
});
