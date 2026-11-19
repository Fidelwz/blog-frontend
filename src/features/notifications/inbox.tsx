'use client';
import Link from 'next/link';
import { useState, useRef } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth';
import { createApiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { notificationLabels, newestNotificationId, parseNotifications } from './adapters';
import { notificationMessage } from './messages';
const api = createApiClient('/api');
export function NotificationCount() {
  const { session } = useSession();
  const id = session.user?.id;
  const count = useQuery({ queryKey:['notifications',id,'count'],enabled:session.status === 'authenticated',meta:{ private:true },retry:false,refetchInterval:60000,queryFn:({signal}) => api<{count:number}>('/notifications/unread/count',{signal}) });
  if (session.status !== 'authenticated') return null;
  if (count.isPending) return <span className="sr-only" role="status">Cargando avisos</span>;
  if (count.error) return <span className="text-xs text-slate-500" title="No pudimos actualizar los avisos" aria-label="No pudimos actualizar los avisos">!</span>;
  if (!count.data?.count) return null;
  return <span aria-label={`${count.data.count} notificaciones sin leer`} className="ml-1 rounded-full bg-pink-600 px-1.5 py-0.5 text-[10px] text-white">{count.data.count}</span>;
}
export function NotificationInbox({ owner }: { owner:string }) {
  const { session } = useSession(), client = useQueryClient();
  const [unread,setUnread] = useState(false), [error,setError] = useState(''), [pending,setPending] = useState(false);
  const busy = useRef(false);
  const active = session.status === 'authenticated' && String(session.user.id) === owner;
  const feed = useInfiniteQuery({ queryKey:['notifications',owner,'list',unread],meta:{ private:true },enabled:active,retry:false,refetchInterval:60000,refetchIntervalInBackground:false,initialPageParam:null as string|null,
    queryFn:async ({pageParam,signal}) => parseNotifications(await api<unknown>(`/notifications?unread=${unread}${pageParam ? `&cursor=${pageParam}` : ''}`,{signal})),
    getNextPageParam:page => page.nextCursor ?? undefined,
  });
  async function mark(id:string, all=false) {
    if (busy.current || !active) return; busy.current = true; setPending(true); setError('');
    try { await api(all ? '/notifications/read' : `/notifications/${id}/read`,{ method:'PATCH',...(all ? { body:JSON.stringify({throughId:id}) } : {}) }); await client.invalidateQueries({queryKey:['notifications']}); }
    catch(e) { setError(e instanceof Error ? e.message : 'No pudimos guardar la lectura.'); }
    finally { busy.current = false; setPending(false); }
  }
  if (!active) return <p>Comprueba tu sesión para ver la bandeja.</p>;
  const items = [...new Map((feed.data?.pages.flatMap(p => p.items) ?? []).map(item => [item.id,item])).values()];
  const throughId = newestNotificationId(items);
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={unread} onChange={e => setUnread(e.target.checked)}/>No leídas (desmarcar para ver todas)</label><Button variant="outline" disabled={pending || !items.length} onClick={() => void mark(throughId!,true)}>Marcar todas como leídas</Button></div>
    {(error || feed.error) && <p role="alert">{error || 'No pudimos cargar la bandeja.'} <Button variant="ghost" onClick={() => void feed.refetch()}>Reintentar</Button></p>}
    {feed.isPending && <p role="status">Cargando avisos…</p>}{!feed.isPending && !feed.error && !items.length && <p className="rounded-xl border bg-white p-10 text-center text-slate-500">No tienes notificaciones con este filtro.</p>}
    <ul className="divide-y overflow-hidden rounded-2xl border bg-white">{items.map(item => <li key={item.id} className={`space-y-3 p-5 ${item.readAt ? '' : 'bg-pink-50/60'}`}><div className="flex items-start justify-between gap-3"><p className={item.readAt ? 'text-slate-600' : 'font-semibold'}>{notificationMessage(item.type,item.message)}</p>{!item.readAt && <span aria-label="Sin leer" className="mt-2 size-2 shrink-0 rounded-full bg-pink-600"/>}</div><span className="text-xs text-pink-700">{notificationLabels[item.type]} · {item.readAt ? 'Leída' : 'No leída'}</span><time className="text-xs text-slate-500" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('es')}</time><div className="flex flex-wrap items-center gap-3">{item.href ? <Link className="text-sm font-semibold text-primary" href={item.href}>Ver contenido</Link> : <span className="text-xs text-slate-500">El aviso se conserva; su contenido puede no estar disponible.</span>}{!item.readAt && <Button variant="ghost" size="sm" disabled={pending} onClick={() => void mark(item.id)}>Marcar como leída</Button>}</div></li>)}</ul>
    {feed.hasNextPage && <Button variant="outline" disabled={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>Cargar más</Button>}
  </div>;
}
