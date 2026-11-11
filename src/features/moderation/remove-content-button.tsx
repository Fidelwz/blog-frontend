'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/features/auth';
import { createApiClient } from '@/lib/api/client';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
const api = createApiClient('/api');
type Props = {type:'post'|'comment';id:string;authorId:string;onRemoved?:() => void};
export function RemoveContentButton(props:Props) {
  const {session} = useSession();
  return session.status === 'authenticated' && String(session.user.id) !== props.authorId
    ? <OwnedRemoval key={session.user.id} {...props} owner={String(session.user.id)}/> : null;
}
function OwnedRemoval({type,id,owner,onRemoved}:Props & {owner:string}) {
  const router = useRouter(), busy = useRef(false);
  const [open,setOpen] = useState(false), [observation,setObservation] = useState('');
  const [pending,setPending] = useState(false), [error,setError] = useState('');
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="ghost" size="sm">Retirar {type === 'post' ? 'publicación' : 'comentario'}</Button></DialogTrigger><DialogContent>
    <DialogTitle>Retirar contenido</DialogTitle><DialogDescription>El contenido dejará de estar disponible y su autor recibirá una notificación. La decisión y tu observación quedarán registradas.</DialogDescription>
    <form className="space-y-3" onSubmit={async event => {
      event.preventDefault(); if (busy.current) return; busy.current = true; setPending(true); setError('');
      try {
        await api(`/${type === 'post' ? 'posts' : 'comments'}/${id}`,{method:'DELETE',headers:{'X-Post-Owner':owner},body:JSON.stringify({observation})});
        setOpen(false); onRemoved?.(); router.refresh();
      } catch(e) { setError(e instanceof Error ? e.message : 'No pudimos confirmar la retirada. Comprueba el contenido antes de reintentar.'); }
      finally { busy.current = false; setPending(false); }
    }}><label className="block text-sm">Observación<Textarea value={observation} onChange={event => setObservation(event.target.value)} required minLength={5} maxLength={1000} disabled={pending}/></label>
      {error && <p role="alert">{error}</p>}<div className="flex justify-end gap-2"><DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit" disabled={pending}>{pending ? 'Retirando…' : 'Confirmar retirada'}</Button></div>
    </form></DialogContent></Dialog>;
}
