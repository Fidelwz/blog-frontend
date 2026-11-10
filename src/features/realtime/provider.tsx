'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth';
import { clearPrivateData, sessionKey } from '@/features/auth/cache';
type RealtimeEvent = { event:string; data:{ room?:string; count?:number } };
type Listener = (event:RealtimeEvent) => void;
type State = 'offline'|'connecting'|'live';
const Context = createContext<{ state:State; subscribe:(room:string,listener:Listener) => () => void }>({state:'offline',subscribe:() => () => {}});
export function RealtimeProvider({children}: {children:ReactNode}) {
  const {session} = useSession(), client = useQueryClient(), router = useRouter();
  const owner = session.status === 'authenticated' ? String(session.user.id) : null;
  const socket = useRef<WebSocket|null>(null), rooms = useRef(new Map<string,Set<Listener>>());
  const [state,setState] = useState<State>('offline');
  const subscribe = useCallback((room:string,listener:Listener) => {
    const first = !rooms.current.has(room);
    const listeners = rooms.current.get(room) ?? new Set<Listener>(); listeners.add(listener); rooms.current.set(room,listeners);
    const [type,id] = room.split(':');
    if (first && socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify({event:'sala:unirse',data:{type,id}}));
    return () => {
      listeners.delete(listener);
      if (!listeners.size) { rooms.current.delete(room); if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify({event:'sala:salir',data:{type,id}})); }
    };
  },[]);
  useEffect(() => {
    if (!owner) return;
    let closed = false, attempt = 0, timer:ReturnType<typeof setTimeout>|undefined;
    const connect = () => {
      if (closed) return;
      const url = new URL('/tiempo-real',window.location.href); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(url); socket.current = ws;
      ws.onopen = () => { setState('connecting'); };
      ws.onmessage = message => {
        let value:unknown; try { value = JSON.parse(String(message.data)); } catch { return; }
        if (!value || typeof value !== 'object') return;
        const event = value as RealtimeEvent;
        if (typeof event.event !== 'string' || !event.data || typeof event.data !== 'object') return;
        if (event.event === 'conexion:lista') {
          attempt = 0; setState('live'); void client.invalidateQueries({queryKey:['notifications']});
          for (const [room,listeners] of rooms.current) {
            const [type,id] = room.split(':'); ws.send(JSON.stringify({event:'sala:unirse',data:{type,id}}));
            for (const callback of listeners) callback({event:'reconexion',data:{room}});
          }
        }
        if (event.event === 'acceso:actualizado') { window.dispatchEvent(new Event('blog:access-changed')); void clearPrivateData(client); router.refresh(); }
        if (event.event.startsWith('notificacion:')) void client.invalidateQueries({queryKey:['notifications']});
        if (event.event === 'cuenta:suspendida') { void clearPrivateData(client); void client.invalidateQueries({queryKey:sessionKey}); }
        const room = event.data.room;
        if (typeof room === 'string' && /^(publicacion|grupo):[1-9]\d*$/.test(room)) {
          for (const callback of rooms.current.get(room) ?? []) callback(event);
        }
      };
      ws.onclose = event => {
        if (closed) return; setState('offline');
        if ([4001,4003].includes(event.code)) { void clearPrivateData(client); void client.invalidateQueries({queryKey:sessionKey}); return; }
        if (attempt < 5) timer = setTimeout(connect,Math.min(30000,1000 * 2 ** attempt++));
      };
      ws.onerror = () => { /* onclose owns reconnection; HTTP remains usable. */ };
    };
    connect();
    return () => { closed = true; if (timer) clearTimeout(timer); socket.current?.close(); socket.current = null; };
  },[owner,client,router]);
  const value = useMemo(() => ({state:owner ? state : 'offline' as State,subscribe}),[owner,state,subscribe]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useRoom(room:string, listener:Listener) {
  const {subscribe,state} = useContext(Context), callback = useRef(listener);
  useEffect(() => { callback.current = listener; },[listener]);
  useEffect(() => subscribe(room,event => callback.current(event)),[subscribe,room]);
  return state;
}
