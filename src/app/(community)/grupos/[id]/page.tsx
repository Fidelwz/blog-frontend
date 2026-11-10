import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/features/auth/server';
import { contentId } from '@/features/publications/adapters';
import { ApiError } from '@/lib/api/client';
import { parseGroup } from '@/features/groups/adapters';
import { groupRequest } from '@/features/groups/server';
import { GroupForm } from '@/features/groups/forms';
export const metadata = { title: 'Grupo de estudio', robots: { index: false, follow: false } };
export default async function Group({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try { contentId(id); } catch { notFound(); }
  const user = await requireUser(`/grupos/${id}`);
  let group;
  try { group = parseGroup(await (await groupRequest(`/groups/${id}`)).json()); } catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error; }
  const roles = { member: 'Miembro', moderator: 'Moderador', administrator: 'Administrador' };
  return <section className="mx-auto max-w-3xl space-y-6 p-6"><Link href="/grupos">Volver a grupos</Link><h1 className="text-3xl font-bold">{group.name}</h1><p>{group.category.name} · {group.members} integrantes</p><p>{group.description}</p><p>{group.myRole ? `Tu rol: ${roles[group.myRole]}` : 'Únete para formar parte de este grupo.'}</p><GroupForm key={`${user.id}:${group.myRole}`} owner={String(user.id)} id={id} member={group.myRole !== null}/><p>La gestión de integrantes y el muro estarán disponibles en las próximas entregas.</p></section>;
}
