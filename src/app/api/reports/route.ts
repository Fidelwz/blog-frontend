import type { NextRequest } from 'next/server';
import { backendFetch } from '@/lib/server/backend-fetch';
import { SESSION_COOKIE } from '@/features/auth/server/cookie';
import { json, errorResponse, requireSameOrigin } from '@/features/auth/server/handlers';
import { readJson } from '@/features/auth/server/request-body';
import { contentId, record, text } from '@/features/publications/adapters';
import { authError } from '@/features/auth/server/backend';
import { plainCommentText } from '@/features/comments/validation';
export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const cookie = request.cookies.get(SESSION_COOKIE)?.value; if (!cookie) throw authError(401,'Inicia sesión para continuar.');
    const body = await readJson(request,['postId','commentId','reason']);
    if (Boolean(body.postId) === Boolean(body.commentId)) throw authError(400,'Selecciona un solo contenido.');
    let ownerId: string;
    try { contentId(body.postId ?? body.commentId); ownerId = contentId(request.headers.get('x-post-owner')); } catch { throw authError(400,'Identificador inválido.'); }
    try { plainCommentText(body.reason,5,500); } catch { throw authError(400,'Escribe un motivo de 5 a 500 caracteres.'); }
    const row = record(await (await backendFetch('/reports',{ method:'POST',cookie,body,expected:201,operation:{ownerId} })).json());
    if (row.status !== 'pendiente') throw authError(502,'El servicio devolvió un reporte no válido.');
    return json({ id:contentId(row.id),status:text(row.status) },201);
  } catch(error) { return errorResponse(error); }
}
