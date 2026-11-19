import { PrivateFeedBoundary } from '@/features/publications/private-feed-boundary';
import Link from 'next/link';
import { UserAvatar } from '@/components/user-avatar';
import { LearningAside } from '@/components/learning-aside';
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
  return <div className="content-grid"><section className="min-w-0 space-y-6"><h1 className="sr-only">Hola, {user.firstName}</h1><div className="composer"><UserAvatar initials={`${user.firstName[0]}${user.lastName[0]}`} photoUrl={user.photoUrl}/><Link className="composer-prompt" href="/publicaciones/nueva">¿Qué quieres compartir con la comunidad?</Link><Link className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white" href="/publicaciones/nueva">Crear publicación</Link></div>
 <nav className="category-tabs" aria-label="Filtrar por materia"><Link href="/inicio" aria-current={!query.has('categoryId') ? 'page' : undefined}>Todas</Link>{categories.map(c => <Link key={c.id} href={`/inicio?categoryId=${c.id}`} aria-current={query.get('categoryId') === c.id ? 'page' : undefined}>{c.name}</Link>)}</nav>
    {error && <p role="alert">{error} <a href="/inicio" className="underline">Recargar</a></p>}
    {page?.elementos.length === 0 && <p className="rounded-xl border bg-white p-8">No hay publicaciones visibles con estos filtros. <Link href="/grupos" className="text-violet-700">Explorar grupos</Link></p>}
    <PrivateFeedBoundary key={`${user.id}:${revision}`} owner={String(user.id)}>{page?.elementos.map(post => <ContentCard key={post.id} post={post}/>)}</PrivateFeedBoundary>
    {page?.siguienteCursor && <Link href={`/inicio?${next}`} className="block rounded-lg border bg-white p-3 text-center">Ver más publicaciones</Link>}
  </section><LearningAside/></div>;
}
