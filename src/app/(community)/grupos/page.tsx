import Link from 'next/link';
import { BookOpen, Users, Plus, ArrowRight } from 'lucide-react';
import { groupRoles } from '@/features/groups/adapters';
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
  return <section className="mx-auto max-w-6xl space-y-6 p-4 md:p-8"><header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">Grupos de estudio</h1><p className="mt-2 text-slate-500">Reúnete con compañeros, comparte recursos y aprende en comunidad.</p></div><a href="#crear-grupo" className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-3 text-sm font-semibold text-white"><Plus size={17}/>Crear grupo</a></header>
    <nav className="flex gap-6 border-b" aria-label="Catálogo de grupos"><Link className={`border-b-2 px-1 py-3 font-semibold ${!query.has('mine') ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500'}`} href="/grupos">Explorar grupos</Link><Link className={`border-b-2 px-1 py-3 font-semibold ${query.has('mine') ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500'}`} href="/grupos?mine=true">Mis grupos</Link></nav>
    <form className="flex flex-wrap items-end gap-4 rounded-xl border bg-white p-4"><label className="min-w-40 flex-1 text-sm font-medium">Buscar grupos<input className="mt-2 block w-full rounded-lg border p-3" name="q" maxLength={254} placeholder="Nombre del grupo…" defaultValue={query.get('q') ?? ''}/></label><label className="text-sm font-medium">Materia<select className="mt-2 block max-w-full rounded-lg border p-3" name="categoryId" defaultValue={query.get('categoryId') ?? ''}><option value="">Todas las materias</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{query.has('mine') && <input type="hidden" name="mine" value="true"/>}<button className="rounded-lg border px-4 py-3 text-sm font-semibold">Filtrar</button><Link className="py-3 text-sm text-violet-700" href="/grupos">Limpiar filtros</Link></form>
    {error && <p role="alert">{error} <Link href="/grupos">Volver al catálogo</Link></p>}
    {page?.items.length === 0 && <div className="rounded-2xl border border-dashed bg-white p-10 text-center"><Users className="mx-auto mb-3 text-violet-600"/><h2 className="font-semibold">No hay grupos con estos filtros</h2><p className="mt-2 text-sm text-slate-500">Prueba otra materia o crea un espacio para tus compañeros.</p></div>}
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{page?.items.map(g => <article className="flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm" key={g.id}><div className="flex items-center justify-between gap-3 bg-linear-to-br from-violet-100 to-violet-50 p-5"><BookOpen className="text-violet-600" size={28}/><span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-cyan-800">{g.category.name}</span></div><div className="flex-1 space-y-3 p-5"><h2 className="text-lg font-bold"><Link className="hover:text-violet-700" href={`/grupos/${g.id}`}>{g.name}</Link></h2><p className="line-clamp-3 text-sm leading-relaxed text-slate-500">{g.description || 'Un espacio para compartir conocimientos y estudiar juntos.'}</p><p className="flex items-center gap-2 text-xs text-slate-500"><Users size={15}/>{g.members} integrantes</p></div><footer className="flex items-center justify-between gap-2 border-t px-5 py-4"><span className="text-xs font-medium text-violet-700">{g.myRole ? groupRoles[g.myRole] : 'Grupo privado'}</span><Link className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700" href={`/grupos/${g.id}`}>{g.myRole ? 'Entrar' : 'Conocer grupo'}<ArrowRight size={16}/></Link></footer></article>)}</div>
    {page?.nextCursor && <Link className="inline-block rounded-lg border bg-white px-5 py-3" href={`/grupos?${next}`}>Siguiente página</Link>}
    <div id="crear-grupo" className="scroll-mt-24"><GroupForm key={user.id} owner={String(user.id)} categories={categories}/></div>
  </section>;
}
