import { notFound } from 'next/navigation';
import { requireUser } from '@/features/auth/server';
import { contentId } from '@/features/publications/adapters';
import { groupRequest } from '@/features/groups/server';
import { parseGroup } from '@/features/groups/adapters';
import { GroupHeader } from '@/features/groups/group-header';
import { GroupAccessBoundary } from '@/features/groups/access-boundary';
import { ModerationQueue } from '@/features/moderation/queue';
export const metadata = { title:'Moderación del grupo',robots:{ index:false,follow:false } };
export default async function Moderation({ params,searchParams }: { params:Promise<{id:string}>; searchParams:Promise<Record<string,string|string[]|undefined>> }) {
  const {id} = await params; try { contentId(id); } catch { notFound(); }
  const user = await requireUser(`/grupos/${id}/moderacion`);
  const group = parseGroup(await (await groupRequest(`/groups/${id}`)).json());
  if (!['moderator','administrator'].includes(group.myRole ?? '') && user.role !== 'administrador') return <p>No tienes permiso para moderar este grupo.</p>;
  return <section className="mx-auto max-w-6xl space-y-6 p-4 md:p-8"><GroupHeader group={group} owner={String(user.id)} tab="moderation"/><GroupAccessBoundary key={`${user.id}:${group.myRole}`} owner={String(user.id)} groupId={id} role={group.myRole}><ModerationQueue groupId={id} owner={String(user.id)} globalAdmin={user.role === 'administrador'} params={await searchParams}/></GroupAccessBoundary></section>;
}
