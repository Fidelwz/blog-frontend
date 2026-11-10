import { PublicExplorer, type SearchParams } from "@/features/publications/public-explorer";
export const metadata = { title: "Explorar publicaciones" };
export default async function Search({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <><div className="page-heading"><h1>Explorar publicaciones</h1><p>Encuentra apuntes, recursos e ideas de la comunidad.</p></div><PublicExplorer params={await searchParams}/></>;
}
