'use client';
import { useActionState, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearPrivateData } from '@/features/auth/cache';
import { manageMember } from './actions';
import { groupRoles, type Member } from './adapters';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const tab = typeof window === 'undefined' ? '' : crypto.randomUUID();
export function isOwnGroupChange(value: unknown) { return value === tab; }
export function announceGroupChange() {
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('group-access'); channel.postMessage(tab); channel.close();
  }
}
export function MemberActions({ member, owner, groupId }: { member: Member; owner: string; groupId: string }) {
  const client = useQueryClient();
  const [kind, setKind] = useState('role');
  const [error, action, pending] = useActionState(async (previous: string, form: FormData) => {
    await clearPrivateData(client); announceGroupChange();
    return manageMember(previous, form);
  }, '');
  return <Dialog><div className="flex flex-wrap gap-2">
    <DialogTrigger asChild><Button variant="outline" onClick={() => setKind('role')}>Cambiar rol</Button></DialogTrigger>
    {member.user.id !== owner && <><DialogTrigger asChild><Button variant="outline" onClick={() => setKind('transfer')}>Transferir</Button></DialogTrigger><DialogTrigger asChild><Button variant="ghost" onClick={() => setKind('remove')}>Expulsar</Button></DialogTrigger></>}
  </div><DialogContent className="sm:max-w-lg"><DialogTitle>{kind === 'role' ? 'Cambiar rol' : kind === 'transfer' ? 'Transferir la administración' : 'Expulsar integrante'}</DialogTitle>
    <DialogDescription>{kind === 'transfer' ? `Entregarás la administración a ${member.user.name} ${member.user.lastName}. Si permaneces, tu nuevo rol será Miembro.` : kind === 'remove' ? `${member.user.name} perderá acceso al muro y a sus recursos. El contenido publicado se conserva.` : `Elige los permisos de ${member.user.name} ${member.user.lastName}.`}</DialogDescription>
    <form action={action} className="space-y-4"><input type="hidden" name="owner" value={owner}/><input type="hidden" name="id" value={groupId}/><input type="hidden" name="userId" value={member.user.id}/><input type="hidden" name="action" value={kind}/>
      <fieldset disabled={pending} className="space-y-4">
      {kind === 'role' && <label className="block">Rol<select name="role" className="mt-2 w-full rounded-lg border p-3" defaultValue={member.role}>{Object.entries(groupRoles).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      {kind === 'transfer' && <label className="flex gap-2 rounded-lg bg-amber-50 p-4"><input name="leave" type="checkbox" defaultChecked/> Salir del grupo después de transferir</label>}
      {error && <p role="alert" className="text-red-700">{error} <a href={`/grupos/${groupId}/miembros`} className="underline">Comprobar estado</a></p>}
      <div className="flex justify-end gap-2"><DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit" className="bg-violet-700 hover:bg-violet-800">{pending ? 'Procesando…' : kind === 'transfer' ? 'Confirmar transferencia' : 'Confirmar cambio'}</Button></div>
      </fieldset>
    </form>
  </DialogContent></Dialog>;
}
