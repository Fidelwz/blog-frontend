'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth';
type RealtimeEvent = { event:string; data:{ room?:string; count?:number } };
type Listener = (event:RealtimeEvent) => void;
type State = 'offline'|'connecting'|'live';
const Context = createContext<{ state:State; subscribe:(room:string,listener:Listener) => () => void }>({state:'offline',subscribe:() => () => {}});
export function RealtimeProvider({children}: {children:ReactNode}) {
  const {session} = useSession(), client = useQueryClient(), router = useRouter();
  const pathname = usePathname(), currentPath = useRef(pathname);
  useEffect(() => { currentPath.current = pathname; },[pathname]);
  const owner = session.status === 'authenticated' ? String(session.user.id) : null;
  const socket = useRef<WebSocket|null>(null), rooms = useRef(new Map<string,Set<Listener>>());
  const state: State = 'offline';
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
    // Nest uses Socket.IO; a native WebSocket cannot speak that protocol.
    // Reconcile from authorized HTTP responses until a same-origin Socket.IO proxy exists.
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      void client.invalidateQueries({queryKey:['notifications']});
      for (const [room,listeners] of rooms.current) {
        for (const callback of listeners) callback({event:'reconexion',data:{room}});
      }
      if (/^\/(inicio|grupos(?:\/[1-9]\d*)?)$/.test(currentPath.current) && !document.querySelector('[data-draft-form]')) router.refresh();
    };
    const timer = setInterval(refresh,15000);
    window.addEventListener('focus',refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus',refresh); };

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
