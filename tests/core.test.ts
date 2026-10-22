import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient, ApiError } from '../src/lib/api/client.ts';
import { validateRegistration } from '../src/lib/validation.ts';
import { listDemoPublications } from '../src/mocks/publications.ts';

test('paginación sin duplicados y búsqueda sin acentos', () => {
  const first = listDemoPublications();
  const second = listDemoPublications({cursor:first.siguienteCursor});
  assert.equal(new Set([...first.elementos,...second.elementos].map(p=>p.id)).size,6);
  assert.equal(second.siguienteCursor,null);
  assert.equal(listDemoPublications({query:'CALCULO'}).elementos.length,1);
  assert.equal(listDemoPublications({query:'inexistente'}).elementos.length,0);
  assert.equal(listDemoPublications({category:'Bases de Datos'}).elementos.length,2);
});
test('registro exige consentimiento y coincidencia de contraseña', () => {
  const data={nombre:'Ana',apellido:'López',correo:'ana@ejemplo.edu',contrasena:'Prueba123!',confirmacion:'Prueba123!',acepta:true};
  assert.deepEqual(validateRegistration(data),{});
  const errors=validateRegistration({...data,acepta:false,confirmacion:'otra',correo:'invalido'});
  assert.deepEqual(Object.keys(errors).sort(),['acepta','confirmacion','correo']);
});
test('cliente envía cookies y admite respuesta vacía sin parsear JSON', async () => {
  let options:RequestInit|undefined;
  const api=createApiClient('http://localhost:3001/api/v1/',async (url,init)=>{
    assert.equal(url,'http://localhost:3001/api/v1/perfil'); options=init;
    return new Response(null,{status:204});
  });
  assert.equal(await api('/perfil',{method:'PATCH',body:JSON.stringify({nombre:'Ana'})}),undefined);
  assert.equal(options?.credentials,'include');
  assert.equal(new Headers(options?.headers).get('Content-Type'),'application/json');
});
test('errores del backend conservan estado y correlación sin reintentos',async()=>{
  let calls=0;
  const api=createApiClient('/api/v1',async()=>{calls++;return Response.json({mensaje:'Sin permiso',idCorrelacion:'abc'},{status:403});});
  await assert.rejects(api('/perfil'),(e:unknown)=>e instanceof ApiError && e.status===403 && e.correlationId==='abc' && e.message==='Sin permiso');
  assert.equal(calls,1);
});
test('errores no JSON y rechazos de red no se convierten en datos de ejemplo',async()=>{
  const api=createApiClient('/api/v1',async()=>new Response('Bad Gateway',{status:502}));
  await assert.rejects(api('/publicaciones'),(e:unknown)=>e instanceof ApiError && e.status===502);
  const offline=createApiClient('/api/v1',async()=>{throw new TypeError('offline');});
  await assert.rejects(offline('/publicaciones'),/offline/);
  await assert.rejects(api('https://otro.test'),/relativa/);
});
test('FormData permite que el navegador asigne el boundary',async()=>{
  const api=createApiClient('/api/v1',async(_url,init)=>{
    assert.equal(new Headers(init?.headers).has('Content-Type'),false);
    return Response.json({ok:true});
  });
  const body=new FormData();body.set('foto',new Blob(['demo']),'foto.png');
  assert.deepEqual(await api('/foto',{method:'POST',body}),{ok:true});
});
