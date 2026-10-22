import { Explorer, CommunityAside } from "@/features/publications/explorer";
import { DEMO_MODE } from "@/lib/demo";
import { Alert } from "@/components/ui/primitives";
export const metadata = { title: "Explorar publicaciones" };
export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string; categoria?: string }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 254) : "";
  const category = typeof params.categoria === "string" ? params.categoria : "Todas";
  return <><div className="page-heading"><span className="eyebrow">CADA PREGUNTA ABRE UN CAMINO</span><h1>{query ? `Resultados para «${query}»` : "Encuentra tu próximo aprendizaje."}</h1><p>Explora los apuntes, recursos e ideas de tus compañeros.</p><form action="/buscar" className="search-page-form" role="search"><input name="q" aria-label="Término de búsqueda" defaultValue={query} placeholder="¿Qué quieres aprender hoy?"/><button className="button button-primary">Buscar</button></form></div>{DEMO_MODE ? <div className="content-grid"><section aria-label="Resultados"><Explorer key={`${query}-${category}`} query={query} initialCategory={category}/></section><CommunityAside/></div> : <Alert>La búsqueda con NestJS está pendiente de integración.</Alert>}</>;
}
