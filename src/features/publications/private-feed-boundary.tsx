'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useSession } from '@/features/auth';
export function PrivateFeedBoundary({owner,children}: {owner:string;children:ReactNode}) {
  const {session} = useSession();
  const [revoked,setRevoked] = useState(false);
  useEffect(() => { const hide = () => setRevoked(true); window.addEventListener('blog:access-changed',hide); return () => window.removeEventListener('blog:access-changed',hide); },[]);
  if (revoked || session.status !== 'authenticated' || String(session.user.id) !== owner) return <p role="status">Actualizando tu acceso… <a href="/inicio" className="underline">Recargar inicio</a></p>;
  return children;
}
