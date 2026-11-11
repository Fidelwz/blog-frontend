'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom } from './provider';
import { useQueryClient } from '@tanstack/react-query';
import { hasEditorDocument } from '@/features/auth/editor-session';
export function RoomStatus({room}: {room:string}) {
  const router = useRouter();
  const client = useQueryClient();
  const [count,setCount] = useState<number|null>(null);
  const state = useRoom(room,event => {
    if (event.event === 'presencia:conectados' && typeof event.data.count === 'number' && Number.isSafeInteger(event.data.count) && event.data.count >= 0) setCount(event.data.count);
    else if (['reconexion','publicacion:nueva','publicacion:actualizada','acceso:actualizado'].includes(event.event) && !hasEditorDocument(client)) router.refresh();
  });
  return <p className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-500" role="status"><span className={`size-2 rounded-full ${state === 'live' ? 'bg-pink-500' : 'bg-slate-300'}`}/>{state === 'live' ? `En vivo${count === null ? '' : ` · ${count} ${count === 1 ? 'persona conectada' : 'personas conectadas'}`}` : 'Conexión en vivo no disponible. Puedes actualizar la vista.'}</p>;
}
