'use client';
import { useRef, useState } from 'react';
import { useSession } from '@/features/auth';
import { createApiClient, ApiError } from '@/lib/api/client';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
const api = createApiClient('/api');
export function ReportButton(props: { type: 'post'|'comment'; id:string }) {
  const {session} = useSession();
  return session.status === 'authenticated' ? <OwnedReportButton key={session.user.id} {...props} owner={String(session.user.id)}/> : null;
}
function OwnedReportButton({type,id,owner}: {type:'post'|'comment';id:string;owner:string}) {
  const [reason,setReason] = useState(''), [error,setError] = useState(''), [done,setDone] = useState(false), [pending,setPending] = useState(false);
  const busy = useRef(false);
  return <Dialog><DialogTrigger asChild><Button variant="ghost" size="sm">Reportar {type === 'post' ? 'publicación' : 'comentario'}</Button></DialogTrigger><DialogContent><DialogTitle>Reportar contenido</DialogTitle><DialogDescription>Describe el problema. El equipo de moderación revisará el contenido y recibirás un aviso con el resultado.</DialogDescription>
    {done ? <p role="status">Reporte recibido. Gracias por ayudar a cuidar la comunidad.</p> : <form className="space-y-3" onSubmit={async event => {
      event.preventDefault(); if (busy.current) return; busy.current = true; setPending(true); setError('');
      try { await api('/reports',{ method:'POST',headers:{'X-Post-Owner':owner},body:JSON.stringify({ [type === 'post' ? 'postId' : 'commentId']:id,reason }) }); setDone(true); setReason(''); }
      catch(e) { setError(e instanceof ApiError && e.status === 409 ? 'Ya reportaste este contenido. El equipo lo revisará.' : e instanceof Error ? e.message : 'No pudimos confirmar el reporte.'); }
      finally { busy.current = false; setPending(false); }
    }}><label className="block text-sm">Motivo<Textarea required minLength={5} maxLength={500} value={reason} disabled={pending} onChange={e => setReason(e.target.value)}/></label>{error && <p role="alert">{error}</p>}<div className="flex justify-end gap-2"><DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit" disabled={pending}>{pending ? 'Enviando…' : 'Enviar reporte'}</Button></div></form>}
  </DialogContent></Dialog>;
}
