import { getCategories, getPublicFeed } from "./server.ts";
import { PublicFeed } from "./feed.tsx";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type SearchParams = { q?: string | string[]; categoryId?: string | string[] };
export async function PublicExplorer({ params = {} }: { params?: SearchParams }) {
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const categoryId = typeof params.categoryId === "string" ? params.categoryId : "";
  const invalidQuery = Array.isArray(params.q) || Array.isArray(params.categoryId) || query.length === 1 || query.length > 254;
  const filters = new URLSearchParams();
  if (query) filters.set("q", query);
  if (categoryId) filters.set("categoryId", categoryId);
  const [categories, page] = await Promise.allSettled([getCategories(), invalidQuery ? Promise.resolve(undefined) : getPublicFeed(filters)]);
  return <><form action="/buscar" className="search-page-form flex-wrap" role="search">
    <label className="sr-only" htmlFor="public-query">Buscar publicaciones</label><Input className="min-w-[12rem]" id="public-query" name="q" defaultValue={query} maxLength={254} placeholder="¿Qué quieres aprender hoy?"/>
    <label className="sr-only" htmlFor="public-category">Materia</label><select id="public-category" name="categoryId" defaultValue={categoryId} className="max-w-full rounded-md border bg-background p-2" disabled={categories.status === "rejected"}>
      <option value="">Todas las materias</option>{categories.status === "fulfilled" && categories.value.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select><Button type="submit">Buscar</Button>
  </form>
    {categories.status === "rejected" && <Notice kind="error">No pudimos cargar las materias. <a href="/buscar">Volver a intentar</a></Notice>}
    {invalidQuery ? <Notice>Escribe entre 2 y 254 caracteres para buscar.</Notice> : <PublicFeed key={`${query}:${categoryId}`} query={query} categoryId={categoryId} initialPage={page.status === "fulfilled" ? page.value : undefined}/>}
  </>;
}
