import 'server-only';
import type { NextRequest } from 'next/server';
import { backendFetch } from '@/lib/server/backend-fetch';
import { contentId } from '@/features/publications/adapters';
import { parseComment, parseComments } from './adapters';
import { SESSION_COOKIE } from '@/features/auth/server/cookie';
import { authError } from '@/features/auth/server/backend';
import { json, errorResponse, requireSameOrigin } from '@/features/auth/server/handlers';
import { readJson } from '@/features/auth/server/request-body';
import { commentQuery, plainCommentText } from './validation';
type Context = { params: Promise<{ id:string }> };
function inputId(value: unknown) {
  try { return contentId(value); } catch { throw authError(400,'Identificador inválido.'); }
}
export async function listComments(request: NextRequest, { params }: Context) {
  try {
    const id = inputId((await params).id);
    let query: URLSearchParams;
    try { query = commentQuery(request.nextUrl.searchParams); } catch { throw authError(400,'Filtro inválido.'); }
    return json(parseComments(await (await backendFetch(`/posts/${id}/comments?${query}`, { cookie: request.cookies.get(SESSION_COOKIE)?.value })).json()));
  } catch (error) { return errorResponse(error); }
}
export async function addComment(request: NextRequest, { params }: Context) {
  try {
    requireSameOrigin(request);
    const id = inputId((await params).id), cookie = request.cookies.get(SESSION_COOKIE)?.value;
    if (!cookie) throw authError(401,'Inicia sesión para comentar.');
    const body = await readJson(request,['content','parentCommentId']);
    // Validate the normalized length; Nest performs the single sanitization pass.
    try { plainCommentText(body.content,1,2000); } catch { throw authError(400,'Escribe entre 1 y 2000 caracteres después de quitar el formato.'); }
    if (body.parentCommentId !== undefined) inputId(body.parentCommentId);
    return json(parseComment(await (await backendFetch(`/posts/${id}/comments`,{ method:'POST',cookie,body,expected:201,operation:{ownerId:inputId(request.headers.get('x-post-owner'))} })).json()),201);
  } catch (error) { return errorResponse(error, false); }
}
export async function deleteComment(request: NextRequest, { params }: Context) {
  try {
    requireSameOrigin(request);
    const id = inputId((await params).id), cookie = request.cookies.get(SESSION_COOKIE)?.value;
    if (!cookie) throw authError(401,'Inicia sesión para continuar.');
    const body = request.headers.get('content-type')?.startsWith('application/json') ? await readJson(request,['observation']) : {};
    if (body.observation !== undefined) {
      try { plainCommentText(body.observation,5,1000); } catch { throw authError(400,'Escribe una observación de 5 a 1000 caracteres.'); }
    }
    await backendFetch(`/comments/${id}`,{ method:'DELETE',cookie,body,expected:204,operation:{ownerId:inputId(request.headers.get('x-post-owner'))} });
    return new Response(null,{ status:204,headers:{ 'Cache-Control':'private, no-store',Vary:'Cookie' } });
  } catch (error) { return errorResponse(error, false); }
}
