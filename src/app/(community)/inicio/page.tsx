import { PrivateFeedBoundary } from '@/features/publications/private-feed-boundary';
import Link from 'next/link';
import { requireUser } from '@/features/auth/server';
import { getCategories } from '@/features/publications/server';
import { groupRequest } from '@/features/groups/server';
import { contentId, parsePostPage } from '@/features/publications/adapters';
import { ContentCard } from '@/features/publications/content-card';
export const metadata = { title: 'Inicio', robots: { index: false, follow: false } };
export default async function Home({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const user = await requireUser('/inicio');
  const params = await searchParams, query = new URLSearchParams();
  let revision = '';
  let error = '', page: ReturnType<typeof parsePostPage> | undefined;
  const categories = await getCategories();
  try {
    for (const [key,value] of Object.entries(params)) {
      if (!['categoryId','cursor'].includes(key) || typeof value !== 'string') throw new Error();
      if (value) query.set(key, contentId(value));
    }
    const response = await groupRequest(`/users/me/feed?${query}`);
    revision = response.headers.get('x-request-id') ?? '';
    page = parsePostPage(await response.json());
  } catch { error = 'No pudimos cargar tu inicio. Revisa los filtros o vuelve a intentarlo.'; }
  const next = new URLSearchParams(query); if (page?.siguienteCursor) next.set('cursor',page.siguienteCursor);
  return <section className="mx-auto max-w-4xl space-y-6 p-4 md:p-8"><header className="rounded-2xl bg-linear-to-r from-blue-50 to-violet-50 p-7"><p className="text-sm font-semibold text-blue-700">Tu comunidad de aprendizaje</p><h1 className="mt-2 text-3xl font-bold">Hola, {user.firstName}</h1><p className="mt-3 text-slate-600">Las publicaciones de la comunidad y de tus grupos, en un solo lugar.</p><Link className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" href="/publicaciones/nueva">Crear publicación</Link></header>
    <form className="flex flex-wrap gap-3 rounded-xl border bg-white p-4"><label className="flex-1">Materia<select className="ml-3 rounded-lg border p-2" name="categoryId" defaultValue={query.get('categoryId') ?? ''}><option value="">Todas las materias</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button className="rounded-lg border px-4 py-2">Filtrar</button><Link href="/buscar" className="p-2 text-blue-700">Buscar en la comunidad</Link></form>
    {error && <p role="alert">{error} <a href="/inicio" className="underline">Recargar</a></p>}
    {page?.elementos.length === 0 && <p className="rounded-xl border bg-white p-8">No hay publicaciones visibles con estos filtros. <Link href="/grupos" className="text-violet-700">Explorar grupos</Link></p>}
    <PrivateFeedBoundary key={`${user.id}:${revision}`} owner={String(user.id)}>{page?.elementos.map(post => <ContentCard key={post.id} post={post}/>)}</PrivateFeedBoundary>
    {page?.siguienteCursor && <Link href={`/inicio?${next}`} className="block rounded-lg border bg-white p-3 text-center">Ver más publicaciones</Link>}
  </section>;
}
