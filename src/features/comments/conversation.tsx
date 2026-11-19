'use client';
import { useRoom } from '@/features/realtime/provider';
import { ReportButton } from '@/features/moderation/report-button';
import { RemoveContentButton } from '@/features/moderation/remove-content-button';
import Link from 'next/link';
import { UserAvatar } from '@/components/user-avatar';
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
import { conversationError } from './errors';
import { useRetryAfter } from './use-retry-after';
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
  const { blocked: coolingDown, respect, canRequest } = useRetryAfter();
  const reading = useRef<AbortController | null>(null);
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
    if (!accessAllowed || !canRequest()) return;
    reading.current?.abort();
    const controller = new AbortController();
    reading.current = controller;
    const signal = lifecycle.current ? AbortSignal.any([controller.signal, lifecycle.current.signal]) : controller.signal;
    try {
      const page = parseComments(await api<unknown>(`/posts/${postId}/comments${next ? `?cursor=${next}` : ''}`,{ signal }));
      if (signal?.aborted) return;
      setItems(previous => next ? [...new Map([...previous,...page.items].map(item => [item.id,item])).values()] : page.items);
      setCursor(page.nextCursor); setBlocked(false); setError('');
    } catch (e) {
      if (signal?.aborted) return;
      if (e instanceof ApiError && [401,403,404].includes(e.status)) { setItems([]); setBlocked(true); }
      respect(e); setError(conversationError(e));
      await clearInvalidProfileSession(client,e);
    } finally { if (!signal?.aborted) setLoading(false); }
  },[postId,accessAllowed,client,canRequest,respect]);
  useEffect(() => {
    lifecycle.current = new AbortController();
    void load();
    const focus = () => void load();
    window.addEventListener('focus',focus);
    return () => { lifecycle.current?.abort(); reading.current?.abort(); window.removeEventListener('focus',focus); };
  },[load]);
  useRoom(`publicacion:${postId}`,event => {
    if (['comentario:nuevo','comentario:retirado','reconexion','publicacion:actualizada'].includes(event.event)) void load();
    if (event.event === 'acceso:revocado') { setItems([]); setBlocked(true); }
  });
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy.current || !canRequest() || !sameOwner() || !accessAllowed || uncertain || blocked) return;
    busy.current = true; setPending(true); setError(''); setNotice('');
    const signal = lifecycle.current?.signal;
    try {
      const comment = parseComment(await api<unknown>(`/posts/${postId}/comments`,{ method:'POST',body:JSON.stringify({ content, ...(reply ? { parentCommentId:reply } : {}) }),headers:{ 'Content-Type':'application/json','X-Post-Owner':owner! },signal }));
      if (signal?.aborted || !sameOwner()) return;
      setContent(''); setReply(null); setNotice(comment.status === 'retained' ? 'Tu comentario está pendiente de revisión y solo tú puedes verlo aquí.' : 'Comentario publicado.');
      await load();
    } catch (e) {
      if (signal?.aborted) return;
      respect(e); setError(conversationError(e));
      if (!(e instanceof ApiError) || e.status >= 500) setUncertain(true);
      if (e instanceof ApiError && [401,403,404].includes(e.status)) { setItems([]); setBlocked(true); }
      await clearInvalidProfileSession(client,e);
      if (e instanceof ApiError && e.code === 'OperationOwnerChanged') await refreshEditorSession(client);
    } finally { busy.current = false; setPending(false); }
  }
  async function remove(id: string) {
    if (busy.current || !canRequest() || !sameOwner() || !accessAllowed || !window.confirm('¿Eliminar este comentario? Las respuestas se conservarán.')) return;
    busy.current = true; setPending(true);
    try { await api(`/comments/${id}`,{ method:'DELETE',body:JSON.stringify({}),headers:{'X-Post-Owner':owner!},signal:lifecycle.current?.signal }); if (!lifecycle.current?.signal.aborted) await load(); }
    catch(e) { if (!lifecycle.current?.signal.aborted) { respect(e); setError(conversationError(e)); await clearInvalidProfileSession(client,e); if (e instanceof ApiError && [401,403,404].includes(e.status)) { setItems([]); setBlocked(true); } } }
    finally { busy.current = false; setPending(false); }
  }
  return <section id="comentarios" className="mt-6 space-y-5 rounded-2xl border bg-white p-5 md:p-7" aria-label="Conversación"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Conversación</h2><Button variant="ghost" disabled={loading || coolingDown} onClick={() => { setLoading(true); void load(); }}>Actualizar</Button></div>
    {error && <Notice kind="error">{error}</Notice>}{notice && <Notice>{notice}</Notice>}
    {owner && !active ? <Notice>{dirty ? 'Tu borrador se conserva en esta pestaña y está oculto hasta recuperar tu sesión.' : 'Inicia sesión de nuevo para participar.'} <a className="underline" href="/acceso" target="_blank" rel="noopener noreferrer">Iniciar sesión en otra pestaña</a><Button variant="outline" onClick={() => void refreshEditorSession(client)}>Comprobar sesión</Button></Notice>
    : owner && accessAllowed && !blocked ? <form data-draft-form onSubmit={submit} className="space-y-3">{reply && <div className="rounded-lg bg-blue-50 p-3 text-sm">Respondiendo al comentario #{reply} <Button type="button" variant="ghost" onClick={() => setReply(null)}>Cancelar respuesta</Button></div>}<label htmlFor="comment-draft" className="block text-sm font-medium">{reply ? 'Tu respuesta' : 'Tu comentario'}</label><Textarea id="comment-draft" required maxLength={2000} value={content} onChange={e => setContent(e.target.value)} disabled={pending || uncertain || coolingDown} rows={3}/><div className="flex items-center justify-between"><span className="text-xs text-slate-500">{content.length} / 2000</span><Button disabled={pending || uncertain || coolingDown || !content.trim()} type="submit">{pending ? 'Enviando…' : reply ? 'Publicar respuesta' : 'Comentar'}</Button></div></form> : !owner ? <p className="text-sm"><Link className="text-primary underline" href={`/acceso?next=${encodeURIComponent(`/publicaciones/${postId}`)}`}>Inicia sesión</Link> para participar.</p> : <a className="underline" href={`/publicaciones/${postId}`}>Comprobar acceso a la publicación</a>}
    {uncertain && <Notice>No pudimos confirmar el envío. Revisa la conversación antes de volver a enviarlo. <Button onClick={() => { void load(); }}>Comprobar comentarios</Button><Button variant="outline" onClick={() => setUncertain(false)}>Habilitar otro envío</Button></Notice>}
    {loading && <p role="status">Cargando conversación…</p>}{!loading && !items.length && !blocked && <p className="py-5 text-center text-sm text-slate-500">Todavía no hay comentarios. Comparte tu primera idea.</p>}
    <ol className="space-y-5">{accessAllowed && items.filter(item => item.status !== 'retained' || (active && item.author.id === owner)).map(item => <li id={`comentario-${item.id}`} key={item.id} className="border-t pt-4"><div className="flex flex-wrap items-center gap-3 text-sm"><UserAvatar initials={`${item.author.firstName[0] ?? ""}${item.author.lastName[0] ?? ""}`}/><Link className="font-semibold" href={`/usuarios/${item.author.id}`}>{item.author.firstName} {item.author.lastName}</Link><time className="ml-auto text-xs text-slate-500" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('es')}</time></div>{item.parent && <blockquote className="my-2 border-l-2 border-slate-200 pl-3 text-xs text-slate-500">Respuesta al comentario #{item.parent.id}: {item.parent.content?.slice(0,180) ?? 'Comentario eliminado o no disponible'}</blockquote>}<p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-relaxed">{item.status === 'deleted' ? 'Comentario eliminado' : item.content}</p>{item.status === 'retained' && <span className="text-xs text-amber-700">Pendiente de revisión · No visible para la comunidad</span>}<div className="mt-2 flex flex-wrap gap-2">{active && item.status === 'visible' && <Button variant="ghost" size="sm" onClick={() => { setReply(item.id); document.getElementById('comment-draft')?.focus(); }}>Responder</Button>}{active && item.status === 'visible' && <ReportButton type="comment" id={item.id}/>} {active && owner === item.author.id && item.status !== 'deleted' && <Button variant="ghost" size="sm" disabled={pending || coolingDown} onClick={() => void remove(item.id)}>Eliminar comentario</Button>}{active && canModerate && item.status !== 'deleted' && <RemoveContentButton type="comment" id={item.id} authorId={item.author.id} onRemoved={() => void load()}/>}</div></li>)}</ol>
    {cursor && <Button variant="outline" disabled={loading || coolingDown} onClick={() => { setLoading(true); void load(cursor); }}>Comentarios anteriores</Button>}
  </section>;
}
