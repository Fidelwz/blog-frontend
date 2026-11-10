import { Hero } from "@/features/publications/explorer";
import { PublicExplorer, type SearchParams } from "@/features/publications/public-explorer";
export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <><Hero/><PublicExplorer params={await searchParams}/></>;
}
