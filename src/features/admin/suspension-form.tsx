'use client';
import { useActionState } from 'react';
import { changeSuspension } from './actions';
export function SuspensionForm({id,owner,suspended}:{id:string;owner:string;suspended:boolean}) {
 const [message,action,pending]=useActionState(changeSuspension,'');
 if(id===owner)return null;
 return <form action={action} className="mt-3 flex flex-wrap gap-3" onSubmit={e=>{if(!window.confirm('¿Confirmar el cambio de acceso de esta cuenta?'))e.preventDefault();}}><input type="hidden" name="id" value={id}/><input type="hidden" name="owner" value={owner}/><input type="hidden" name="action" value={suspended?'reactivate':'suspend'}/>{!suspended&&<><label>Días <input name="days" type="number" min={1} max={90} defaultValue={7} required className="w-20 rounded border p-2"/></label><label>Motivo <input name="reason" minLength={5} maxLength={500} required className="rounded border p-2"/></label></>}<button disabled={pending} className="rounded border px-3">{pending?'Guardando…':suspended?'Reactivar':'Suspender'}</button>{message&&<p role="status">{message}</p>}</form>;
}
