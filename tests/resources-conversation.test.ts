import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAttachment } from '../src/features/publications/adapters.ts';
import { parseMembers } from '../src/features/groups/adapters.ts';
import { parseComment } from '../src/features/comments/adapters.ts';
import { parseNotifications } from '../src/features/notifications/adapters.ts';
import { resourceFileError, MAX_RESOURCE_BYTES } from '../src/features/publications/resource-file.ts';
test('recursos solo traducen rutas privadas controladas y eliminan datos del proveedor', () => {
  const attachment = {id:'3',postId:'4',type:'document',title:'Documento',url:'/api/v1/posts/4/attachments/3/content',order:1,cloudinaryPublicId:'secret'};
  assert.equal(parseAttachment(attachment).url,'/api/posts/4/attachments/3/content');
  assert.equal('cloudinaryPublicId' in parseAttachment(attachment),false);
  for (const url of ['//evil.test/path','/api/v1/posts/4/attachments/3/content?token=bad','/api/v1/posts/4/attachments/../content','javascript:alert(1)']) assert.throws(() => parseAttachment({...attachment,url}));
  assert.throws(() => parseAttachment({...attachment,type:'link'}));
});
test('integrantes no incorporan correo ni permisos desconocidos', () => {
  const member = {role:'moderator',joinedAt:'2026-11-10T12:00:00Z',user:{userId:'8',name:'Ana',lastName:'Pérez',major:null,email:'private@test.example'}};
  const page = parseMembers({items:[member],nextCursor:null});
  assert.equal('email' in page.items[0].user,false);
  assert.throws(() => parseMembers({items:[{...member,role:'owner'}],nextCursor:null}));
});
test('conversación conserva contexto neutral sin propagar campos internos', () => {
  const c = parseComment({id:'1',postId:'2',content:null,status:'eliminado',createdAt:'2026-11-10T12:00:00Z',author:{id:'3',name:'Ana',lastName:'Pérez',email:'private'},parent:{id:'4',content:null},observation:'internal'});
  assert.equal(c.parent?.content,null); assert.equal(c.content,null); assert.equal('observation' in c,false); assert.equal('email' in c.author,false);
});
test('bandeja neutral acepta destino ausente y rechaza enlaces ajenos', () => {
  const notice = {id:'1',type:'comentario',message:'Actividad',href:null,createdAt:'2026-11-10T12:00:00Z',readAt:null};
  assert.equal(parseNotifications({items:[notice],nextCursor:null,unreadCount:1}).items[0].href,null);
  assert.throws(() => parseNotifications({items:[{...notice,href:'https://evil.test'}],nextCursor:null,unreadCount:1}));
});
test('subida permite PDF e imágenes hasta el límite web y rechaza vacíos o tipos cruzados', () => {
  assert.equal(resourceFileError({size:MAX_RESOURCE_BYTES,type:'application/pdf'},'document'),null);
  assert.ok(resourceFileError({size:MAX_RESOURCE_BYTES+1,type:'application/pdf'},'document'));
  assert.ok(resourceFileError({size:0,type:'image/png'},'image'));
  assert.ok(resourceFileError({size:12,type:'application/pdf'},'image'));
});
