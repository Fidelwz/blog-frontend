'use client';
import { useActionState } from 'react';
import { moderate } from './actions';
import { Button } from '@/components/ui/button';
export function ReviewForm({ owner, id, kind, type, version, globalAdmin }: { owner:string; id:string; kind:'report'|'retained'; type:string; version:number|null; globalAdmin:boolean }) {
  const [message,action,pending] = useActionState(moderate,'');
  return <form action={action} className="mt-5 space-y-3 border-t pt-4" onSubmit={e => { if (!window.confirm('¿Confirmar esta decisión de moderación?')) e.preventDefault(); }}><input type="hidden" name="owner" value={owner}/><input type="hidden" name="id" value={id}/><input type="hidden" name="kind" value={kind}/><input type="hidden" name="type" value={type}/>{version !== null && <input type="hidden" name="version" value={version}/>}
    <fieldset disabled={pending || message === 'Decisión guardada.'} className="space-y-3"><label className="block text-sm font-medium">Decisión<select className="mt-1 block w-full rounded-lg border p-3" name="decision">{kind === 'report' ? <><option value="desestimado">Desestimar reporte</option><option value="contenido_retirado">Retirar contenido</option>{globalAdmin && <option value="usuario_suspendido">Retirar contenido y suspender autor</option>}</> : <><option value="publish">Aprobar publicación</option><option value="remove">Retirar contenido</option></>}</select></label>
    {kind === 'report' && globalAdmin && <label className="block text-sm">Duración si se suspende (días)<input type="number" name="days" min={1} max={30} defaultValue={7} className="ml-2 w-20 rounded border p-2"/></label>}
    <label className="block text-sm font-medium">Observación {kind === 'retained' && '(opcional)'}<textarea name="observation" className="mt-1 block w-full rounded-lg border p-3" rows={3} minLength={kind === 'report' ? 5 : undefined} maxLength={1000} required={kind === 'report'}/></label><Button type="submit" className="bg-violet-700 hover:bg-violet-800">{pending ? 'Guardando…' : 'Confirmar decisión'}</Button></fieldset>{message && <p role="status">{message}</p>}
  </form>;
}
