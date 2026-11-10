'use client';
import { useRoom } from '@/features/realtime/provider';
import { useEffect, useState, type ReactNode } from 'react';
import { useSession } from '@/features/auth';
import { useQueryClient } from '@tanstack/react-query';
import { clearPrivateData } from '@/features/auth/cache';
import { isOwnGroupChange } from './member-actions';
import type { Group } from './adapters';

/** No persistent cache. Recheck on focus, membership changes and periodically. */
export function GroupAccessBoundary({ owner, groupId, role, children }: { owner: string; groupId: string; role: Group['myRole']; children: ReactNode }) {
  const { session } = useSession();
  const client = useQueryClient();
  const [allowed, setAllowed] = useState(true);
  useRoom(`grupo:${groupId}`,event => { if (event.event === 'acceso:revocado') { setAllowed(false); void clearPrivateData(client); } });
  useEffect(() => {
    const abort = new AbortController();
    let checking = false;
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch(`/api/groups/${groupId}`, { cache: 'no-store', signal: abort.signal });
        const group: Group = await response.json();
        if (!response.ok || group.myRole !== role) {
          setAllowed(false); await clearPrivateData(client);
        }
      } catch { if (!abort.signal.aborted) setAllowed(false); }
      finally { checking = false; }
    };
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('group-access');
    if (channel) channel.onmessage = event => { if (isOwnGroupChange(event.data)) return; setAllowed(false); void clearPrivateData(client); };
    const timer = setInterval(() => void check(), 20000);
    window.addEventListener('focus', check);
    return () => { abort.abort(); channel?.close(); clearInterval(timer); window.removeEventListener('focus', check); };
  }, [groupId, role, client]);
  if (!allowed || session.status !== 'authenticated' || String(session.user.id) !== owner) return <div role="status" className="rounded-xl border bg-white p-6">Comprueba tu acceso para continuar. <a className="text-violet-700 underline" href={`/grupos/${groupId}`}>Recargar grupo</a></div>;
  return children;
}
