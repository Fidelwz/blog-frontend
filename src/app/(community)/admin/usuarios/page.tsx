import { SuspensionForm } from '@/features/admin/suspension-form';
import { requireUser } from '@/features/auth/server';
import Link from 'next/link';
import { groupRequest } from '@/features/groups/server';
import { contentId } from '@/features/publications/adapters';
type User={id_usuario:string;nombre:string;apellido:string;rol:string;estado:string};
export default async function Users({searchParams}:{searchParams:Promise<{q?:string;cursor?:string;role?:string;status?:string}>}) {
  const owner=await requireUser('/admin/usuarios'); const params=await searchParams; const query=new URLSearchParams();
  if(params.q)query.set('q',params.q.trim().slice(0,254));
  if(params.role)query.set('role',params.role);if(params.status)query.set('status',params.status);
  if(params.cursor)query.set('cursor',contentId(params.cursor));
  const page:{items:User[];nextCursor:string|null}=await(await groupRequest(`/admin/users?${query}`)).json();
  const next=new URLSearchParams(query);if(page.nextCursor)next.set('cursor',page.nextCursor);
  return <><h2 className="text-xl font-bold">Usuarios</h2><form className="flex flex-wrap gap-3"><label>Buscar por nombre <input name="q" defaultValue={params.q} maxLength={254} className="rounded border p-2"/></label><label>Rol <select name="role" defaultValue={params.role??""}><option value="">Todos</option><option value="usuario">Usuario</option><option value="administrador">Administrador</option></select></label><label>Estado <select name="status" defaultValue={params.status??""}><option value="">Todos</option><option value="activo">Activo</option><option value="suspendido">Suspendido</option></select></label><button className="rounded border px-4">Buscar</button></form><ul className="divide-y rounded-xl border bg-white p-5">{page.items.map(user=><li key={user.id_usuario} className="flex flex-wrap justify-between gap-3 py-4"><Link href={`/usuarios/${user.id_usuario}`}>{user.nombre} {user.apellido}</Link><span>{user.rol} · {user.estado}</span><SuspensionForm id={user.id_usuario} owner={String(owner.id)} suspended={user.estado==='suspendido'}/></li>)}</ul>{!page.items.length&&<p>No hay usuarios con estos filtros.</p>}{page.nextCursor&&<Link href={`/admin/usuarios?${next}`}>Siguiente página</Link>}</>;
}
