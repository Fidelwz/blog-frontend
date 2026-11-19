import { test, expect } from '@playwright/test';
const mock='http://127.0.0.1:4023';
const origin='http://localhost:3019';
test('notificaciones: contador, paginación, filtro y marcado individual/masivo',async({page,request})=>{
  await page.goto('/notificaciones');
  await expect(page.getByText('Aviso 105',{exact:true})).toBeVisible();
  await expect(page.getByLabel('3 notificaciones sin leer').first()).toBeVisible();
  await page.getByRole('button',{name:'Cargar más'}).click();
  await expect(page.getByText('Aviso 103',{exact:true})).toBeVisible();
  const row=page.getByRole('listitem').filter({hasText:'Aviso 105'});
  await expect(row.getByRole('link',{name:'Ver contenido'})).toHaveAttribute('href','/publicaciones/9');
  await row.getByRole('button',{name:'Marcar como leída',exact:true}).click();
  await expect(page.getByLabel('2 notificaciones sin leer').first()).toBeVisible();
  await page.getByRole('checkbox').check();
  await expect(page.getByText('Aviso 105',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Marcar todas como leídas'}).click();
  await expect(page.getByText('No tienes notificaciones con este filtro.')).toBeVisible();
  await expect(page.getByLabel('2 notificaciones sin leer')).toHaveCount(0);
  const calls=await(await request.get(`${mock}/__calls`)).json();
  const patches=calls.filter((c:{method:string;path:string})=>c.method==='PATCH'&&c.path.startsWith('/notifications'));
  expect(patches).toHaveLength(2);expect(patches[1].body).toEqual({throughId:'104'});
  expect(patches.every((c:{owner?:string})=>!c.owner)).toBe(true);
});
test.beforeEach(async({request,context})=>{
  await request.post(`${mock}/__reset`);
  await context.addCookies([{name:'jwt',value:'mock.comments',url:origin,httpOnly:true,secure:true,sameSite:'Strict'}]);
});
test('lista plana, padre ausente, paginación, creación retenida, respuesta y eliminación',async({page,request},info)=>{
  await page.goto('/publicaciones/9');
  const conversation=page.getByRole('region',{name:'Conversación'});
  await expect(conversation.getByText('Ana Pruebas').first()).toBeVisible();
  await expect(conversation.getByText(/Respuesta al comentario #10/)).toBeVisible();
  await expect(conversation.getByText('Comentario eliminado',{exact:true})).toBeVisible();
  await expect(page.locator('#comentario-11').getByRole('button')).toHaveCount(0);
  await conversation.getByRole('button',{name:'Comentarios anteriores'}).click();
  await expect(conversation.getByText('Mi comentario',{exact:true})).toBeVisible();
  await page.locator('#comentario-10').getByRole('button',{name:'Responder',exact:true}).click();
  await page.getByRole('button',{name:'Cancelar respuesta'}).click();
  await expect(page.getByLabel('Tu comentario',{exact:true})).toBeVisible();
  await page.locator('#comentario-10').getByRole('button',{name:'Responder',exact:true}).click();
  await page.getByLabel('Tu respuesta',{exact:true}).fill('Mi respuesta nueva');
  await page.getByRole('button',{name:'Publicar respuesta',exact:true}).click();
  await expect(conversation.getByText('Mi respuesta nueva',{exact:true})).toBeVisible();
  await page.getByLabel('Tu comentario',{exact:true}).fill('Texto para retener');
  await page.getByRole('button',{name:'Comentar',exact:true}).dblclick();
  await expect(conversation.getByText('Pendiente de revisión · No visible para la comunidad')).toBeVisible();
  const calls=await (await request.get(`${mock}/__calls`)).json();
  expect(calls.filter((call:{method:string;body:{content?:string}})=>call.method==='POST'&&call.body.content==='Texto para retener')).toHaveLength(1);
  page.once('dialog',dialog=>dialog.accept());
  await conversation.getByRole('listitem').filter({hasText:'Texto para retener'}).getByRole('button',{name:'Eliminar comentario'}).click();
  await expect(conversation.getByText('Texto para retener',{exact:true})).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('comentarios-mobile.png'),fullPage:true});
});
test('reportar envía únicamente commentId y maneja duplicado y espera 429',async({page,request})=>{
  await page.goto('/publicaciones/9');
  await page.locator('#comentario-12').getByRole('button',{name:'Reportar comentario'}).click();
  const dialog=page.getByRole('dialog',{name:'Reportar contenido'});
  await dialog.getByLabel('Motivo').fill('Motivo del reporte');
  await request.post(`${mock}/__fault`,{data:{path:'/reports',method:'POST',status:429}});
  await dialog.getByRole('button',{name:'Enviar reporte'}).click();
  await expect(dialog.getByRole('alert')).toContainText('2 segundos');
  await expect(dialog.getByRole('button',{name:'Enviar reporte'})).toBeDisabled();
  await expect(dialog.getByRole('button',{name:'Enviar reporte'})).toBeEnabled({timeout:4000});
  await request.post(`${mock}/__fault`,{data:{path:'/reports',method:'POST',status:409}});
  await dialog.getByRole('button',{name:'Enviar reporte'}).click();
  await expect(dialog.getByRole('alert')).toContainText('Ya reportaste');
  await dialog.getByRole('button',{name:'Enviar reporte'}).click();
  await expect(dialog.getByRole('status')).toContainText('Reporte recibido');
  const calls=await (await request.get(`${mock}/__calls`)).json();
  const reportCalls=calls.filter((call:{path:string})=>call.path==='/reports');
  expect(reportCalls).toHaveLength(3);
  for(const call of reportCalls)expect(call.body).toEqual({commentId:'12',reason:'Motivo del reporte'});
});
test('BFF conserva cookie, owner, cursor, limit, cuerpos, 204 y errores seguros',async({page,request})=>{
  const api=page.request, headers={Origin:origin,'X-Post-Owner':'7'};
  const listed=await api.get('/api/posts/9/comments?limit=1&cursor=12');expect(listed.status()).toBe(200);
  expect((await listed.json()).items).toHaveLength(1);
  expect((await api.get('/api/posts/9/comments?limit=51')).status()).toBe(400);
  expect((await api.post('/api/posts/9/comments',{headers:{...headers,Origin:'https://other.test'},data:{content:'Hola'}})).status()).toBe(403);
  expect((await api.post('/api/posts/9/comments',{headers,data:{content:'<script>bad</script>'}})).status()).toBe(400);
  expect((await api.post('/api/posts/9/comments',{headers,data:{content:'Hola',parentCommentId:12}})).status()).toBe(400);
  expect((await api.delete('/api/comments/12',{headers,data:{observation:'a'}})).status()).toBe(400);
  const created=await api.post('/api/posts/9/comments',{headers,data:{content:' <b>Respuesta</b> ',parentCommentId:'12'}});expect(created.status()).toBe(201);
  expect((await created.json()).author.firstName).toBe('Ana');
  expect((await api.delete('/api/comments/10',{headers,data:{}})).status()).toBe(204);
  for(const status of [401,403,404,409,429,500]){
    await request.post(`${mock}/__fault`,{data:{path:'/posts/9/comments',method:'POST',status}});
    const response=await api.post('/api/posts/9/comments',{headers,data:{content:'Validación'}});
    expect(response.status()).toBe(status===500?502:status);
    const body=await response.json();expect(JSON.stringify(body)).not.toContain('private upstream');expect(body.idCorrelacion).toBeTruthy();
    if(status===429)expect(response.headers()['retry-after']).toBe('2');
  }
  const calls=await (await request.get(`${mock}/__calls`)).json();
  expect(calls.some((call:{body:{parentCommentId?:string;content?:string};cookie:string;owner:string})=>call.body.parentCommentId==='12'&&call.body.content===' <b>Respuesta</b> '&&call.cookie==='jwt=mock.comments'&&call.owner==='7')).toBe(true);
});
test('fallo incierto conserva borrador y no reintenta la creación automáticamente',async({page,request})=>{
  await page.goto('/publicaciones/9');
  await page.getByLabel('Tu comentario',{exact:true}).fill('Borrador sin confirmar');
  await request.post(`${mock}/__fault`,{data:{path:'/posts/9/comments',method:'POST',status:500}});
  await page.getByRole('button',{name:'Comentar',exact:true}).click();
  await expect(page.getByLabel('Tu comentario',{exact:true})).toHaveValue('Borrador sin confirmar');
  await expect(page.getByRole('button',{name:'Comentar',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Habilitar otro envío'})).toBeVisible();
  const calls=await (await request.get(`${mock}/__calls`)).json();
  expect(calls.filter((call:{method:string;body:{content?:string}})=>call.method==='POST'&&call.body.content==='Borrador sin confirmar')).toHaveLength(1);
});
test('moderador retira comentario ajeno con observación y conserva contexto',async({page,request})=>{
  await page.goto('/publicaciones/9');
  const item=page.locator('#comentario-12');
  await expect(item.getByRole('button',{name:'Eliminar comentario'})).toHaveCount(0);
  await item.getByRole('button',{name:'Retirar comentario'}).click();
  const dialog=page.getByRole('dialog',{name:'Retirar contenido'});
  await dialog.getByLabel('Observación').fill('Retirada de prueba');
  await dialog.getByRole('button',{name:'Confirmar retirada'}).click();
  await expect(item.getByText('Comentario eliminado',{exact:true})).toBeVisible();
  const calls=await (await request.get(`${mock}/__calls`)).json();
  expect(calls.some((call:{path:string;method:string;body:{observation?:string}})=>call.path==='/comments/12'&&call.method==='DELETE'&&call.body.observation==='Retirada de prueba')).toBe(true);
});
test('moderación muestra decisiones para pending y aprueba comentarios retenidos',async({page,request})=>{
  if(process.env.DEBUG_COMMENT_TEST){page.on('request',r=>{if(r.method()==='POST')console.log(r.method(),r.url());});page.on('response',r=>{if(r.request().method()==='POST')console.log(r.status(),r.url());});page.on('pageerror',e=>console.log(e.message));}
  await page.goto('/moderacion?type=comment');
  await expect(page.getByLabel('Decisión')).toBeVisible();
  await page.getByRole('link',{name:'Ver detalle del reporte'}).click();
  await expect(page.getByRole('heading',{name:'Reporte de comentario'})).toBeVisible();
  await page.getByLabel('Observación').fill('Revisión completada');
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Confirmar decisión'}).click();
  try { await expect(page.getByText('Desestimado',{exact:true})).toBeVisible({timeout:20_000}); }
  catch(error){if(process.env.DEBUG_COMMENT_TEST)console.log(await (await request.get(`${mock}/__calls`)).json());throw error;}
  await page.goto('/moderacion?view=retained&type=comment');
  await expect(page.getByText('Revisar comentario',{exact:true})).toBeVisible();
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Confirmar decisión'}).click();
  await expect(page.getByRole('status')).toHaveText('Decisión guardada.',{timeout:20_000});
});
