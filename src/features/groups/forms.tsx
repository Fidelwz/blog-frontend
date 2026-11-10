'use client';
import { useActionState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearPrivateData } from '@/features/auth/cache';
import { announceGroupChange } from './member-actions';
import { changeGroup } from './actions';
import type { Category } from '@/features/categories/adapters';
export function GroupForm({ owner, categories, id, member }: { owner: string; categories?: Category[]; id?: string; member?: boolean }) {
  const client = useQueryClient();
  const [error, action, pending] = useActionState(async (previous: string, form: FormData) => {
    await clearPrivateData(client); if (id) announceGroupChange();
    return changeGroup(previous, form);
  }, '');
  return <form action={action} onSubmit={event => { if (member && !window.confirm('¿Salir del grupo? Perderás acceso a sus publicaciones y recursos.')) event.preventDefault(); }} className={id ? "space-y-3" : "space-y-4 rounded-xl border bg-white p-6"}>
    <input type="hidden" name="owner" value={owner}/><input type="hidden" name="action" value={id ? member ? 'leave' : 'join' : 'create'}/>{id && <input type="hidden" name="id" value={id}/>}
    <fieldset disabled={pending} className="space-y-4">
      {!id && <><h2 className="text-xl font-semibold">Crear grupo</h2><label className="block">Nombre<input className="block w-full rounded border p-2" name="name" required minLength={3} maxLength={100}/></label><label className="block">Descripción<textarea className="block w-full rounded border p-2" name="description" maxLength={1000}/></label><label className="block">Materia<select className="block w-full rounded border p-2" name="categoryId" required defaultValue=""><option value="" disabled>Selecciona una materia</option>{categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></>}
      <button className="rounded bg-violet-700 px-4 py-2 text-white hover:bg-violet-800" type="submit">{pending ? 'Procesando…' : id ? member ? 'Salir del grupo' : 'Unirme al grupo' : 'Crear grupo'}</button>
    </fieldset>{error && <p role="alert">{error} {member && <a href={`/grupos/${id}/miembros`} className="underline">Transferir administración</a>} <a href={id ? `/grupos/${id}` : '/grupos'} className="underline">Comprobar estado</a></p>}
  </form>;
}
