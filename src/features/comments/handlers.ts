import 'server-only';
import type { NextRequest } from 'next/server';
import { backendFetch } from '@/lib/server/backend-fetch';
import { contentId } from '@/features/publications/adapters';
import { parseComment, parseComments } from './adapters';
import { SESSION_COOKIE } from '@/features/auth/server/cookie';
import { authError } from '@/features/auth/server/backend';
import { json, errorResponse, requireSameOrigin } from '@/features/auth/server/handlers';
import { readJson } from '@/features/auth/server/request-body';
type Context = { params: Promise<{ id:string }> };
export async function listComments(request: NextRequest, { params }: Context) {
  try {
    const id = contentId((await params).id), query = new URLSearchParams();
    for (const [key,value] of request.nextUrl.searchParams) {
      if (key !== 'cursor' || query.has(key)) throw authError(400,'Filtro inválido.'); query.set(key,contentId(value));
    }
    return json(parseComments(await (await backendFetch(`/posts/${id}/comments?${query}`, { cookie: request.cookies.get(SESSION_COOKIE)?.value })).json()));
  } catch (error) { return errorResponse(error); }
}
export async function addComment(request: NextRequest, { params }: Context) {
  try {
    requireSameOrigin(request);
    const id = contentId((await params).id), cookie = request.cookies.get(SESSION_COOKIE)?.value;
    if (!cookie) throw authError(401,'Inicia sesión para comentar.');
    const body = await readJson(request,['content','parentCommentId']);
    if (typeof body.content !== 'string' || !body.content.trim() || body.content.length > 2000) throw authError(400,'Escribe entre 1 y 2000 caracteres.');
    if (body.parentCommentId !== undefined) contentId(body.parentCommentId);
    return json(parseComment(await (await backendFetch(`/posts/${id}/comments`,{ method:'POST',cookie,body,expected:201,operation:{ownerId:contentId(request.headers.get('x-post-owner'))} })).json()),201);
  } catch (error) { return errorResponse(error, false); }
}
export async function deleteComment(request: NextRequest, { params }: Context) {
  try {
    requireSameOrigin(request);
    const id = contentId((await params).id), cookie = request.cookies.get(SESSION_COOKIE)?.value;
    if (!cookie) throw authError(401,'Inicia sesión para continuar.');
    const body = request.headers.get('content-type')?.startsWith('application/json') ? await readJson(request,['observation']) : {};
    await backendFetch(`/comments/${id}`,{ method:'DELETE',cookie,body,expected:204,operation:{ownerId:contentId(request.headers.get('x-post-owner'))} });
    return new Response(null,{ status:204,headers:{ 'Cache-Control':'private, no-store',Vary:'Cookie' } });
  } catch (error) { return errorResponse(error, false); }
}
