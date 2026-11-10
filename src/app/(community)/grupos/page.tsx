import Link from 'next/link';
import { requireUser } from '@/features/auth/server';
import { getCategories } from '@/features/publications/server';
import { contentId } from '@/features/publications/adapters';
import { parseGroups } from '@/features/groups/adapters';
import { groupRequest } from '@/features/groups/server';
import { GroupForm } from '@/features/groups/forms';
export const metadata = { title: 'Grupos de estudio' };
export default async function Groups({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser('/grupos');
  const params = await searchParams, query = new URLSearchParams();
  let invalid = false;
  try {
    for (const key of Object.keys(params)) {
      const value = params[key];
      if (!['q', 'categoryId', 'mine', 'cursor'].includes(key) || typeof value !== 'string') throw new Error();
      if (!value) continue;
      if (key === 'q') { if (value.trim().length > 254) throw new Error(); query.set(key, value.trim()); }
      else if (key === 'mine') { if (value !== 'true') throw new Error(); query.set(key, value); }
      else query.set(key, contentId(value));
    }
  } catch { invalid = true; }
  const categories = await getCategories();
  let page: ReturnType<typeof parseGroups> | undefined;
  let error = invalid ? 'Los filtros no son válidos.' : '';
  if (!invalid) try { page = parseGroups(await (await groupRequest(`/groups?${query}`)).json()); } catch { error = 'No pudimos cargar los grupos. Inténtalo de nuevo.'; }
  const next = new URLSearchParams(query); if (page?.nextCursor) next.set('cursor', page.nextCursor);
  return <section className="mx-auto max-w-5xl space-y-6 p-6"><h1 className="text-3xl font-bold">Grupos de estudio</h1><p>Encuentra compañeros para estudiar y compartir conocimientos.</p>
    <form className="flex flex-wrap items-end gap-4"><label>Buscar<input className="block rounded border p-2" name="q" maxLength={254} defaultValue={query.get('q') ?? ''}/></label><label>Materia<select className="block rounded border p-2" name="categoryId" defaultValue={query.get('categoryId') ?? ''}><option value="">Todas</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label><input type="checkbox" name="mine" value="true" defaultChecked={query.has('mine')}/> Solo mis grupos</label><button className="rounded border p-2">Filtrar</button><Link href="/grupos">Limpiar filtros</Link></form>
    {error && <p role="alert">{error} <Link href="/grupos">Volver al catálogo</Link></p>}
    {page?.items.length === 0 && <p>No hay grupos con estos filtros.</p>}
    <div className="grid gap-4 md:grid-cols-2">{page?.items.map(g => <article className="rounded-xl border p-5" key={g.id}><h2 className="text-xl font-semibold"><Link href={`/grupos/${g.id}`}>{g.name}</Link></h2><p>{g.category.name} · {g.members} integrantes</p><p>{g.description}</p>{g.myRole && <p>Ya eres integrante</p>}</article>)}</div>
    {page?.nextCursor && <Link className="underline" href={`/grupos?${next}`}>Siguiente página</Link>}
    <GroupForm key={user.id} owner={String(user.id)} categories={categories}/>
  </section>;
}
