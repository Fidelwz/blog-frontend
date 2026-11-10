import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/features/auth/server';
import { contentId } from '@/features/publications/adapters';
import { ApiError } from '@/lib/api/client';
import { parseGroup, parseMembers, groupRoles } from '@/features/groups/adapters';
import { groupRequest } from '@/features/groups/server';
import { GroupHeader } from '@/features/groups/group-header';
import { MemberActions } from '@/features/groups/member-actions';
import { GroupAccessBoundary } from '@/features/groups/access-boundary';
export const metadata = { title: 'Integrantes del grupo', robots: { index: false, follow: false } };
export default async function Members({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const { id } = await params;
  try { contentId(id); } catch { notFound(); }
  const user = await requireUser(`/grupos/${id}/miembros`);
  let group;
  try { group = parseGroup(await (await groupRequest(`/groups/${id}`)).json()); } catch (e) { if (e instanceof ApiError && e.status === 404) notFound(); throw e; }
  const query = new URLSearchParams();
  let error = '';
  try {
    for (const [key,value] of Object.entries(await searchParams)) {
      if (!['q','cursor'].includes(key) || typeof value !== 'string') throw new Error();
      if (key === 'q') { if (value.trim().length > 254) throw new Error(); if (value.trim()) query.set(key,value.trim()); }
      else query.set(key,contentId(value));
    }
  } catch { error = 'Los filtros no son válidos.'; }
  let page: ReturnType<typeof parseMembers> | undefined;
  if (group.myRole && !error) try { page = parseMembers(await (await groupRequest(`/groups/${id}/members?${query}`)).json()); }
  catch { error = 'No pudimos cargar los integrantes. Tu acceso puede haber cambiado.'; }
  const next = new URLSearchParams(query); if (page?.nextCursor) next.set('cursor',page.nextCursor);
  return <section className="mx-auto max-w-6xl space-y-6 p-4 md:p-8"><GroupHeader group={group} owner={String(user.id)} tab="members"/>
    {!group.myRole ? <p>Únete al grupo para ver sus integrantes.</p> : <GroupAccessBoundary key={`${user.id}:${group.myRole}`} owner={String(user.id)} groupId={id} role={group.myRole}>
      <div className="space-y-5 rounded-2xl border bg-white p-5 md:p-7"><div><h2 className="text-xl font-bold">Miembros del grupo</h2><p className="mt-1 text-sm text-slate-500">Los miembros publican; los moderadores supervisan contenido; los administradores gestionan integrantes y roles.</p></div>
      {group.myRole === 'administrator' && <p className="rounded-lg bg-violet-50 p-4 text-sm text-violet-900">Para salir como último administrador, busca otro integrante y selecciona Transferir. La transferencia y la salida se confirman juntas.</p>}
      <form className="flex flex-wrap gap-3"><label className="flex-1">Buscar por nombre<input className="mt-1 block w-full rounded-lg border p-3" name="q" maxLength={254} defaultValue={query.get('q') ?? ''}/></label><button className="self-end rounded-lg border px-4 py-3">Buscar</button><Link className="self-end p-3 text-violet-700" href={`/grupos/${id}/miembros`}>Limpiar</Link></form>
      {error && <p role="alert">{error} <a href={`/grupos/${id}/miembros`} className="underline">Reintentar</a></p>}
      {page?.items.length === 0 && <p>No hay integrantes que coincidan con la búsqueda.</p>}
      <ul className="divide-y">{page?.items.map(member => <li key={member.user.id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div><Link className="font-semibold hover:text-violet-700" href={`/usuarios/${member.user.id}`}>{member.user.name} {member.user.lastName}{member.user.id === String(user.id) && ' (tú)'}</Link><p className="mt-1 text-sm text-slate-500">{groupRoles[member.role]} · Desde {new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(member.joinedAt))}</p>{member.user.major && <p className="text-xs text-slate-500">{member.user.major}</p>}</div>{group.myRole === 'administrator' && <MemberActions member={member} owner={String(user.id)} groupId={id}/>}</li>)}</ul>
      {page?.nextCursor && <Link href={`/grupos/${id}/miembros?${next}`} className="inline-block rounded-lg border px-4 py-2">Siguiente página</Link>}</div>
    </GroupAccessBoundary>}
  </section>;
}
