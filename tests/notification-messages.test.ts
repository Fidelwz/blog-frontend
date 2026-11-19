import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationMessage } from '../src/features/notifications/messages.ts';
test('traducción exacta por tipo sin inventar detalles ni alterar mensajes desconocidos',()=>{
  assert.equal(notificationMessage('comment','There is a new comment on your post.'),'Nuevo comentario en tu publicación.');
  assert.equal(notificationMessage('report_result','The reported content was removed and its author suspended.'),'Se retiró el contenido reportado y se suspendió a su autor.');
  assert.equal(notificationMessage('reply','Mensaje nuevo con contexto'),'Mensaje nuevo con contexto');
  assert.equal(notificationMessage('reply','There is a new comment on your post.'),'There is a new comment on your post.');
});
