'use client';
import { useRoom } from '@/features/realtime/provider';
import { ReportButton } from '@/features/moderation/report-button';
import { RemoveContentButton } from '@/features/moderation/remove-content-button';
import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from '@/features/auth';
import { useQueryClient } from '@tanstack/react-query';
import { sessionKey } from '@/features/auth/cache';
import type { AuthSession } from '@/features/auth/types';
import { retainEditorDocument, refreshEditorSession } from '@/features/auth/editor-session';
import { clearInvalidProfileSession } from '@/features/profile/cache';
import { useDraftNavigation } from '@/lib/navigation/draft-navigation';
import { createApiClient, ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/notice';
import { Textarea } from '@/components/ui/textarea';
import { parseComment, parseComments, type Comment } from './adapters';
const api = createApiClient('/api');
export function Conversation({ postId, enabled, accessAllowed, canModerate }: { postId: string; enabled: boolean; accessAllowed:boolean;canModerate:boolean }) {
  const { session } = useSession();
  const account = session.status === 'authenticated' ? String(session.user.id) : null;
  const [owner,setOwner] = useState(account), [discarded,setDiscarded] = useState(false);
  if (account && owner === null && !discarded) setOwner(account);
  if (account && owner && account !== owner && !discarded) setDiscarded(true);
  if (discarded) return <Notice>La cuenta cambió. Descartamos el borrador del comentario anterior. <a href={`/publicaciones/${postId}`} className="underline">Abrir la conversación</a></Notice>;
  return enabled ? <OwnedConversation key={`${postId}:${owner}`} postId={postId} owner={owner} active={account !== null && account === owner} accessAllowed={accessAllowed} canModerate={canModerate}/> : <Notice>La conversación estará disponible cuando se apruebe esta publicación.</Notice>;
}
function OwnedConversation({ postId, owner, active, accessAllowed, canModerate }: { postId: string; owner: string | null;active:boolean;accessAllowed:boolean;canModerate:boolean }) {
  const client = useQueryClient();
  const [items,setItems] = useState<Comment[]>([]), [cursor,setCursor] = useState<string|null>(null);
  const [content,setContent] = useState(''), [reply,setReply] = useState<string|null>(null);
  const [loading,setLoading] = useState(true), [pending,setPending] = useState(false), [blocked,setBlocked] = useState(false);
  const [error,setError] = useState(''), [notice,setNotice] = useState(''), [uncertain,setUncertain] = useState(false);
  const busy = useRef(false), lifecycle = useRef<AbortController|null>(null);
  const [previousAccess,setPreviousAccess] = useState(accessAllowed);
  if (previousAccess !== accessAllowed) {
    setPreviousAccess(accessAllowed);
    setItems([]); setCursor(null); setBlocked(false); setError('');
  }
  const dirty = Boolean(content || pending || uncertain);
  useDraftNavigation(dirty);
  useEffect(() => owner && dirty ? retainEditorDocument(client) : undefined,[client,owner,dirty]);
  const sameOwner = () => {
    const session = client.getQueryData<AuthSession>(sessionKey);
    return active && session?.status === 'authenticated' && String(session.user.id) === owner;
  };
  const load = useCallback(async (next?: string) => {
    if (!accessAllowed) return;
    const signal = lifecycle.current?.signal;
    try {
      const page = parseComments(await api<unknown>(`/posts/${postId}/comments${next ? `?cursor=${next}` : ''}`,{ signal }));
      if (signal?.aborted) return;
      setItems(previous => next ? [...new Map([...previous,...page.items].map(item => [item.id,item])).values()] : page.items);
      setCursor(page.nextCursor); setBlocked(false); setError('');
    } catch (e) {
      if (signal?.aborted) return;
      if (e instanceof ApiError && [401,403,404].includes(e.status)) { setItems([]); setBlocked(true); }
      setError(e instanceof Error ? e.message : 'No pudimos cargar la conversación.');
      await clearInvalidProfileSession(client,e);
    } finally { if (!signal?.aborted) setLoading(false); }
  },[postId,accessAllowed,client]);
  useEffect(() => {
    lifecycle.current = new AbortController();
    void load();
    const focus = () => void load();
    window.addEventListener('focus',focus);
    return () => { lifecycle.current?.abort(); window.removeEventListener('focus',focus); };
  },[load]);
  useRoom(`publicacion:${postId}`,event => {
    if (['comentario:nuevo','comentario:retirado','reconexion','publicacion:actualizada'].includes(event.event)) void load();
    if (event.event === 'acceso:revocado') { setItems([]); setBlocked(true); }
  });
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy.current || !sameOwner() || !accessAllowed || uncertain || blocked) return;
    busy.current = true; setPending(true); setError(''); setNotice('');
    const signal = lifecycle.current?.signal;
    try {
      const comment = parseComment(await api<unknown>(`/posts/${postId}/comments`,{ method:'POST',body:JSON.stringify({ content, ...(reply ? { parentCommentId:reply } : {}) }),headers:{ 'Content-Type':'application/json','X-Post-Owner':owner! },signal }));
      if (signal?.aborted || !sameOwner()) return;
      setContent(''); setReply(null); setNotice(comment.status === 'retenido' ? 'Tu comentario está pendiente de revisión y solo tú puedes verlo aquí.' : 'Comentario publicado.');
      await load();
    } catch (e) {
      if (signal?.aborted) return;
      setError(e instanceof Error ? e.message : 'No pudimos confirmar el envío.');
      if (!(e instanceof ApiError) || e.status >= 500) setUncertain(true);
      if (e instanceof ApiError && [401,403,404].includes(e.status)) { setItems([]); setBlocked(true); }
      await clearInvalidProfileSession(client,e);
      if (e instanceof ApiError && e.code === 'OperationOwnerChanged') await refreshEditorSession(client);
    } finally { busy.current = false; setPending(false); }
  }
  async function remove(id: string) {
    if (busy.current || !sameOwner() || !accessAllowed || !window.confirm('¿Eliminar este comentario? Las respuestas se conservarán.')) return;
    busy.current = true; setPending(true);
    try { await api(`/comments/${id}`,{ method:'DELETE',headers:{'X-Post-Owner':owner!},signal:lifecycle.current?.signal }); if (!lifecycle.current?.signal.aborted) await load(); }
    catch(e) { if (!lifecycle.current?.signal.aborted) setError(e instanceof Error ? e.message : 'No pudimos confirmar el cambio.'); }
    finally { busy.current = false; setPending(false); }
  }
  return <section id="comentarios" className="mt-6 space-y-5 rounded-2xl border bg-white p-5 md:p-7" aria-label="Conversación"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Conversación</h2><Button variant="ghost" disabled={loading} onClick={() => { setLoading(true); void load(); }}>Actualizar</Button></div>
    {error && <Notice kind="error">{error}</Notice>}{notice && <Notice>{notice}</Notice>}
    {owner && !active ? <Notice>{dirty ? 'Tu borrador se conserva en esta pestaña y está oculto hasta recuperar tu sesión.' : 'Inicia sesión de nuevo para participar.'} <a className="underline" href="/acceso" target="_blank" rel="noopener noreferrer">Iniciar sesión en otra pestaña</a><Button variant="outline" onClick={() => void refreshEditorSession(client)}>Comprobar sesión</Button></Notice>
    : owner && accessAllowed && !blocked ? <form data-draft-form onSubmit={submit} className="space-y-3">{reply && <div className="rounded-lg bg-violet-50 p-3 text-sm">Respondiendo al comentario seleccionado <Button type="button" variant="ghost" onClick={() => setReply(null)}>Cancelar respuesta</Button></div>}<label htmlFor="comment-draft" className="block text-sm font-medium">{reply ? 'Tu respuesta' : 'Tu comentario'}</label><Textarea id="comment-draft" required maxLength={2000} value={content} onChange={e => setContent(e.target.value)} disabled={pending || uncertain} rows={3}/><div className="flex items-center justify-between"><span className="text-xs text-slate-500">{content.length} / 2000</span><Button disabled={pending || uncertain || !content.trim()} type="submit">{pending ? 'Enviando…' : reply ? 'Publicar respuesta' : 'Comentar'}</Button></div></form> : !owner ? <p className="text-sm"><Link className="text-primary underline" href={`/acceso?next=${encodeURIComponent(`/publicaciones/${postId}`)}`}>Inicia sesión</Link> para participar.</p> : <a className="underline" href={`/publicaciones/${postId}`}>Comprobar acceso a la publicación</a>}
    {uncertain && <Notice>No pudimos confirmar el envío. Revisa la conversación antes de volver a enviarlo. <Button onClick={() => { void load(); }}>Comprobar comentarios</Button><Button variant="outline" onClick={() => setUncertain(false)}>Habilitar otro envío</Button></Notice>}
    {loading && <p role="status">Cargando conversación…</p>}{!loading && !items.length && !blocked && <p className="py-5 text-center text-sm text-slate-500">Todavía no hay comentarios. Comparte tu primera idea.</p>}
    <ol className="space-y-5">{accessAllowed && items.map(item => <li id={`comentario-${item.id}`} key={item.id} className="border-t pt-4"><div className="flex flex-wrap justify-between gap-2 text-sm"><Link className="font-semibold" href={`/usuarios/${item.author.id}`}>{item.author.name} {item.author.lastName}</Link><time className="text-xs text-slate-500" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('es')}</time></div>{item.parent && <blockquote className="my-2 border-l-2 border-violet-300 pl-3 text-xs text-slate-500">En respuesta a: {item.parent.content?.slice(0,180) ?? 'Comentario no disponible'}</blockquote>}<p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-relaxed">{item.content ?? 'Comentario retirado'}</p>{item.status === 'retenido' && <span className="text-xs text-amber-700">Pendiente de revisión</span>}<div className="mt-2 flex flex-wrap gap-2">{active && item.status === 'visible' && <Button variant="ghost" size="sm" onClick={() => { setReply(item.id); document.getElementById('comment-draft')?.focus(); }}>Responder</Button>}{active && item.status === 'visible' && <ReportButton type="comment" id={item.id}/>} {active && owner === item.author.id && item.status !== 'eliminado' && <Button variant="ghost" size="sm" disabled={pending} onClick={() => void remove(item.id)}>Eliminar comentario</Button>}{active && canModerate && item.status !== 'eliminado' && <RemoveContentButton type="comment" id={item.id} authorId={item.author.id} onRemoved={() => void load()}/>}</div></li>)}</ol>
    {cursor && <Button variant="outline" disabled={loading} onClick={() => { setLoading(true); void load(cursor); }}>Comentarios anteriores</Button>}
  </section>;
}
