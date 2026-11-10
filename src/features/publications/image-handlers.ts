import 'server-only';
import type { NextRequest } from 'next/server';
import { backendFetch } from '../../lib/server/backend-fetch.ts';
import { authError } from '../auth/server/backend.ts';
import { requireCookie } from '../profile/server/backend.ts';
import { SESSION_COOKIE } from '../auth/server/cookie.ts';
import { json, errorResponse, requireSameOrigin } from '../auth/server/handlers.ts';
import { readBody, readJson } from '../auth/server/request-body.ts';
import { contentId, parseAttachment } from './adapters.ts';

type Context = { params: Promise<{ id: string; attachmentId?: string }> };
async function mutate(request: NextRequest, context: Context, method: 'POST' | 'DELETE' | 'PATCH') {
  try {
    requireSameOrigin(request);
    const cookie = requireCookie(request.cookies.get(SESSION_COOKIE)?.value);
    const operation = { ownerId:contentId(request.headers.get('x-post-owner')) };
    const params = await context.params;
    let id: string, attachmentId: string | undefined;
    try { id = contentId(params.id); if (method === 'DELETE') attachmentId = contentId(params.attachmentId); }
    catch { throw authError(400, 'Identificador inválido.'); }
    if (method === 'DELETE') {
      await backendFetch(`/posts/${id}/attachments/${attachmentId}`, { method, cookie, operation, expected: 204 });
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
    }
    if (method === 'PATCH') {
      const body = await readJson(request, ['attachmentIds']);
      const ids = body.attachmentIds;
      if (!Array.isArray(ids) || !ids.length || ids.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) throw authError(400, 'El orden de los recursos no es válido.');
      const response = await backendFetch(`/posts/${id}/attachments/order`, { method, cookie, operation, body });
      const rows: unknown = await response.json();
      if (!Array.isArray(rows)) throw new Error();
      return json(rows.map(parseAttachment));
    }
    let body: FormData | Record<string,unknown>;
    if (request.headers.get('content-type')?.startsWith('application/json')) {
      body = await readJson(request, ['type','title','url']);
      if (body.type !== 'link' || typeof body.url !== 'string' || body.url.length > 1024) throw authError(400,'Enlace inválido.');
      try { const url = new URL(body.url); if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw new Error(); }
      catch { throw authError(400,'Usa un enlace HTTP o HTTPS válido.'); }
      if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 150) throw authError(400,'El título debe tener entre 1 y 150 caracteres.');
    } else {
      const contentType = request.headers.get('content-type') ?? '';
      if (!contentType.startsWith('multipart/form-data;')) throw authError(415,'Selecciona una imagen o un PDF.');
      const bytes = await readBody(request, 4 * 1024 * 1024 + 65536);
      let data: FormData;
      try { data = await new Response(new Uint8Array(bytes), { headers: { 'Content-Type': contentType } }).formData(); } catch { throw authError(400,'No pudimos leer el archivo.'); }
      for (const key of data.keys()) if (!['file','type','title'].includes(key) || data.getAll(key).length !== 1) throw authError(400,'Envía un solo recurso.');
      const file = data.get('file'), title = data.get('title'), type = data.get('type') ?? 'image';
      if (!(file instanceof File) || file.size === 0) throw authError(400,'Selecciona un archivo.');
      if (file.size > 4 * 1024 * 1024) throw authError(413,'El archivo no debe superar 4 MB.');
      if (!(type === 'image' ? ['image/jpeg','image/png'] : type === 'document' ? ['application/pdf'] : []).includes(file.type)) throw authError(415,'Usa una imagen JPG/PNG o un PDF.');
      if (typeof title !== 'string' || !title.trim() || title.trim().length > 150) throw authError(400,'El título debe tener entre 1 y 150 caracteres.');
      body = new FormData(); body.set('file',file,file.name); body.set('type',type); body.set('title',title.trim());
    }
    return json(parseAttachment(await (await backendFetch(`/posts/${id}/attachments`, { method, body, cookie, operation, expected: 201 })).json()),201);
  } catch (error) { return errorResponse(error, true); }
}
export const addImage = (request: NextRequest, context: Context) => mutate(request, context, 'POST');
export const removeImage = (request: NextRequest, context: Context) => mutate(request, context, 'DELETE');
export const reorderResources = (request: NextRequest, context: Context) => mutate(request, context, 'PATCH');
export async function resourceContent(request: NextRequest, context: Context) {
  try {
    const params = await context.params, id = contentId(params.id), attachmentId = contentId(params.attachmentId);
    const cookie = request.cookies.get(SESSION_COOKIE)?.value;
    const response = await backendFetch(`/posts/${id}/attachments/${attachmentId}/content`, { cookie });
    const mime = response.headers.get('content-type')?.split(';')[0];
    if (!mime || !['image/png','image/jpeg','application/pdf'].includes(mime)) throw new Error();
    const bytes = await readBody(new Request('http://localhost/resource', { method: 'POST', body: response.body, duplex: 'half' } as RequestInit), 10 * 1024 * 1024);
    return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': mime, 'Cache-Control': 'private, no-store', Vary: 'Cookie', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Content-Disposition': mime === 'application/pdf' ? 'attachment; filename="recurso.pdf"' : 'inline' } });
  } catch (error) { return errorResponse(error); }
}
