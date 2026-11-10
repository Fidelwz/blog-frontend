'use client';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/features/auth';
import { useRoom } from '@/features/realtime/provider';
export function PostAccessBoundary({id,owner,children}: {id:string;owner:string|null;children:ReactNode}) {
  const {session} = useSession(), router = useRouter();
  const [revoked,setRevoked] = useState(false);
  useRoom(`publicacion:${id}`,event => {
    if (event.event === 'acceso:revocado') setRevoked(true);
    if (event.event === 'publicacion:actualizada') router.refresh();
  });
  if (revoked || (owner !== null && (session.status !== 'authenticated' || String(session.user.id) !== owner))) return <p role="status" className="rounded-xl border bg-white p-6">El acceso a esta publicación cambió. <a className="underline" href={`/publicaciones/${id}`}>Comprobar acceso</a></p>;
  return children;
}
