import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationHref, notificationLabels, newestNotificationId, parseNotifications } from '../src/features/notifications/adapters.ts';
import { createApiClient } from '../src/lib/api/client.ts';
test('notificaciones aceptan los seis tipos reales y sobreviven la conversión BFF',()=>{
  for(const type of Object.keys(notificationLabels)) {
    const page=parseNotifications({items:[{id:'9007199254740993',type,message:'Mensaje original',href:'/posts/9007199254740994',createdAt:'2026-11-18T12:00:00Z',readAt:null}],nextCursor:null,unreadCount:1});
    assert.equal(page.items[0].href,'/publicaciones/9007199254740994');
    assert.deepEqual(parseNotifications(page),page);
  }
});
test('destinos controlados y avisos neutrales',()=>{
  assert.equal(notificationHref(null),null);
  assert.equal(notificationHref('/moderation'),'/moderacion');
  assert.equal(notificationHref('/groups/42/moderation'),'/grupos/42/moderacion');
  for(const href of ['https://evil.test','//evil.test','/posts/1?next=bad','/posts/0','/posts/9223372036854775808','/unknown','/posts/1/../2']) assert.throws(()=>notificationHref(href));
});
test('límite masivo usa el máximo ID sin asumir orden ni convertirlo a Number',()=>{
  assert.equal(newestNotificationId([{id:'9007199254740992'},{id:'9007199254740993'},{id:'2'}]),'9007199254740993');
  assert.equal(newestNotificationId([]),null);
});
test('lectura individual sin cuerpo y masiva con throughId, cookies y 204 sin JSON',async()=>{
  const calls:RequestInit[]=[];
  const api=createApiClient('/api',async(_,init)=>{calls.push(init!);return new Response(null,{status:204});});
  await api('/notifications/42/read',{method:'PATCH'});
  await api('/notifications/read',{method:'PATCH',body:JSON.stringify({throughId:'9007199254740993'})});
  assert.equal(calls[0].body,undefined);assert.equal(calls[0].credentials,'include');
  assert.equal(new Headers(calls[0].headers).has('X-Post-Owner'),false);
  assert.deepEqual(JSON.parse(String(calls[1].body)),{throughId:'9007199254740993'});
});
