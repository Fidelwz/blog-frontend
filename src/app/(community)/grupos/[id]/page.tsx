import { RoomStatus } from '@/features/realtime/room-status';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LockKeyhole, Plus, BookOpen } from 'lucide-react';
import { requireUser } from '@/features/auth/server';
import { contentId, parsePostPage } from '@/features/publications/adapters';
import { ApiError } from '@/lib/api/client';
import { parseGroup } from '@/features/groups/adapters';
import { groupRequest } from '@/features/groups/server';
import { GroupHeader } from '@/features/groups/group-header';
import { GroupAccessBoundary } from '@/features/groups/access-boundary';
import { ContentCard } from '@/features/publications/content-card';
export const metadata = { title: 'Grupo de estudio', robots: { index: false, follow: false } };
export default async function Group({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const { id } = await params;
  try { contentId(id); } catch { notFound(); }
  const user = await requireUser(`/grupos/${id}`);
  let group;
  try { group = parseGroup(await (await groupRequest(`/groups/${id}`)).json()); } catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error; }
  let page: ReturnType<typeof parsePostPage> | undefined;
  let error = '';
  if (group.myRole) try {
    const filters = await searchParams, query = new URLSearchParams();
    for (const [key,value] of Object.entries(filters)) {
      if (key !== 'cursor' || typeof value !== 'string') throw new Error();
      query.set(key, contentId(value));
    }
    page = parsePostPage(await (await groupRequest(`/posts/group/${id}?${query}`)).json());
  } catch { error = 'No pudimos cargar el muro. Comprueba tu acceso y vuelve a intentarlo.'; }
  return <section className="mx-auto max-w-6xl space-y-6 p-4 md:p-8"><GroupHeader group={group} owner={String(user.id)}/>
    {!group.myRole ? <div className="grid justify-items-center gap-4 rounded-2xl border bg-white p-10 text-center"><LockKeyhole className="text-violet-600" size={40}/><h2 className="text-xl font-bold">Un espacio para aprender juntos</h2><p className="max-w-lg text-slate-500">{group.description || 'Comparte dudas, apuntes y recursos con tus compañeros.'}</p><p className="text-sm">Únete al grupo para ver sus publicaciones e integrantes.</p></div> : <GroupAccessBoundary key={`${user.id}:${group.myRole}`} owner={String(user.id)} groupId={id} role={group.myRole}>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]"><div className="space-y-5"><RoomStatus room={`grupo:${id}`}/><Link href={`/publicaciones/nueva?grupo=${id}`} className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-5 text-slate-600 shadow-sm"><span>Comparte una duda, un apunte o un recurso…</span><span className="flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white"><Plus size={17}/>Publicar</span></Link>
      {error && <p role="alert" className="rounded-xl border bg-white p-5">{error} <a className="underline" href={`/grupos/${id}`}>Reintentar</a></p>}
      {page?.elementos.length === 0 && <div className="rounded-2xl border border-dashed bg-white p-10 text-center"><BookOpen className="mx-auto mb-3 text-violet-500"/><h2 className="text-lg font-semibold">El aprendizaje empieza contigo</h2><p className="mt-2 text-sm text-slate-500">Todavía no hay publicaciones visibles. Comparte la primera.</p></div>}
      {page?.elementos.map(post => <ContentCard key={post.id} post={post}/>)}
      {page?.siguienteCursor && <Link className="block rounded-lg border bg-white p-3 text-center" href={`/grupos/${id}?cursor=${page.siguienteCursor}`}>Ver más publicaciones</Link>}</div>
      <aside className="space-y-4"><section className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="font-bold">Acerca del grupo</h2><p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{group.description || 'Este grupo aún no tiene descripción.'}</p><hr/><h3 className="text-sm font-semibold">Aprendamos con respeto</h3><p className="text-sm text-slate-500">Comparte recursos útiles, cita tus fuentes y ayuda a tus compañeros.</p><Link href={`/grupos/${id}/miembros`} className="inline-block text-sm font-semibold text-violet-700">Ver integrantes →</Link></section></aside></div>
    </GroupAccessBoundary>}
  </section>;
}
