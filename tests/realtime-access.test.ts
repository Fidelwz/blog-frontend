import test from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { clearGroupContent, refreshOnMembershipChange } from '../src/features/realtime/access-changes.ts';

test('membership revocation removes private content but preserves profile and session', async () => {
  const client = new QueryClient();
  for (const key of [['posts','mine','1'],['profile','me'],['auth','session']]) {
    client.setQueryDefaults(key,{meta:{private:true}});
    client.setQueryData(key,{id:'1'});
  }
  client.setQueryData(['posts','public'],{items:[]});
  await clearGroupContent(client);
  assert.equal(client.getQueryData(['posts','mine','1']),undefined);
  assert.deepEqual(client.getQueryData(['profile','me']),{id:'1'});
  assert.deepEqual(client.getQueryData(['auth','session']),{id:'1'});
  assert.deepEqual(client.getQueryData(['posts','public']),{items:[]});
  assert.equal(client.getQueryState(['profile','me'])?.isInvalidated,true);
  client.clear();
});

test('membership events refresh content routes without interrupting account forms', () => {
  for (const path of ['/inicio','/grupos/1','/grupos/1/miembros','/publicaciones/1','/mis-publicaciones','/moderacion']) assert.equal(refreshOnMembershipChange(path),true);
  for (const path of ['/perfil','/acceso','/recuperar','/usuarios/1','/buscar']) assert.equal(refreshOnMembershipChange(path),false);
});
