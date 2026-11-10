import type { NextRequest } from 'next/server';
import { backendFetch } from '@/lib/server/backend-fetch';
import { SESSION_COOKIE } from '@/features/auth/server/cookie';
import { json, errorResponse, requireSameOrigin } from '@/features/auth/server/handlers';
import { readJson } from '@/features/auth/server/request-body';
import { contentId, record, text } from '@/features/publications/adapters';
import { authError } from '@/features/auth/server/backend';
export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const cookie = request.cookies.get(SESSION_COOKIE)?.value; if (!cookie) throw authError(401,'Inicia sesión para continuar.');
    const body = await readJson(request,['postId','commentId','reason']);
    if (Boolean(body.postId) === Boolean(body.commentId)) throw authError(400,'Selecciona un solo contenido.');
    contentId(body.postId ?? body.commentId);
    if (typeof body.reason !== 'string' || body.reason.trim().length < 5 || body.reason.length > 500) throw authError(400,'Escribe un motivo de 5 a 500 caracteres.');
    const row = record(await (await backendFetch('/reports',{ method:'POST',cookie,body,expected:201,operation:{ownerId:contentId(request.headers.get('x-post-owner'))} })).json());
    return json({ id:contentId(row.id),status:text(row.status) },201);
  } catch(error) { return errorResponse(error); }
}
