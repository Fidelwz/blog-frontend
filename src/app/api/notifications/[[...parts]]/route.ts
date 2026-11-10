import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/features/auth/server/cookie';
import { authError } from '@/features/auth/server/backend';
import { json, errorResponse, requireSameOrigin } from '@/features/auth/server/handlers';
import { readJson } from '@/features/auth/server/request-body';
import { backendFetch } from '@/lib/server/backend-fetch';
import { parseNotifications } from '@/features/notifications/adapters';
import { contentId, record } from '@/features/publications/adapters';
type Context = { params:Promise<{parts?:string[]}> };
export async function GET(request: NextRequest,{params}: Context) {
  try {
    const cookie = request.cookies.get(SESSION_COOKIE)?.value; if (!cookie) throw authError(401,'Inicia sesión para continuar.');
    const parts = (await params).parts ?? [];
    if (parts.join('/') === 'unread/count') {
      const value = record(await (await backendFetch('/notifications/unread/count',{cookie})).json());
      if (typeof value.count !== 'number' || !Number.isSafeInteger(value.count) || value.count < 0) throw new Error();
      return json({ count:value.count });
    }
    if (parts.length) throw authError(404,'Ruta inválida.');
    const query = new URLSearchParams();
    for (const [key,value] of request.nextUrl.searchParams) {
      if (!['cursor','unread'].includes(key) || query.has(key)) throw authError(400,'Filtro inválido.');
      if (key === 'cursor') query.set(key,contentId(value)); else { if (!['true','false'].includes(value)) throw authError(400,'Filtro inválido.'); query.set(key,value); }
    }
    return json(parseNotifications(await (await backendFetch(`/notifications?${query}`,{cookie})).json()));
  } catch(error) { return errorResponse(error); }
}
export async function PATCH(request: NextRequest,{params}: Context) {
  try {
    requireSameOrigin(request);
    const cookie = request.cookies.get(SESSION_COOKIE)?.value; if (!cookie) throw authError(401,'Inicia sesión para continuar.');
    const parts = (await params).parts ?? [];
    let path:string, body:Record<string,unknown>|undefined;
    if (parts.length === 1 && parts[0] === 'read') { path = '/notifications/read'; body = await readJson(request,['throughId']); contentId(body.throughId); }
    else if (parts.length === 2 && parts[1] === 'read') path = `/notifications/${contentId(parts[0])}/read`;
    else throw authError(404,'Ruta inválida.');
    await backendFetch(path,{ method:'PATCH',cookie,body,expected:204 });
    return new Response(null,{ status:204,headers:{ 'Cache-Control':'private, no-store',Vary:'Cookie' } });
  } catch(error) { return errorResponse(error); }
}
