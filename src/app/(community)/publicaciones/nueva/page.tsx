import Link from 'next/link';
import { requireUser } from '@/features/auth/server';
import { getCategories } from '@/features/publications/server';
import { PublicationForm } from '@/features/publications/publication-form';
import { groupRequest } from '@/features/groups/server';
import { parseGroup, parseGroups } from '@/features/groups/adapters';
import { contentId } from '@/features/publications/adapters';
import { Notice } from '@/components/notice';
export default async function CreatePublication({ searchParams }: { searchParams: Promise<{ grupo?: string | string[] }> }) {
  const user = await requireUser('/publicaciones/nueva');
  const { grupo } = await searchParams;
  const groups = parseGroups(await (await groupRequest('/groups?mine=true&limit=50')).json()).items;
  let unavailable = false;
  if (grupo !== undefined) {
    try {
      const selected = parseGroup(await (await groupRequest(`/groups/${contentId(grupo)}`)).json());
      if (!selected.myRole) unavailable = true;
      if (!groups.some(g => g.id === selected.id)) groups.push(selected);
    } catch { unavailable = true; }
  }
  if (unavailable) return <Notice>No tienes acceso a ese grupo o no pudimos comprobarlo. <Link href="/grupos">Volver al catálogo</Link></Notice>;
  return <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-5 md:p-8"><PublicationForm ownerId={String(user.id)} categories={await getCategories()} groups={groups.map(g => ({ id: g.id, name: g.name, categoryId: g.category.id }))} initialGroup={typeof grupo === 'string' ? grupo : ''}/></div>;
}
