import { Hero } from "@/features/publications/explorer";
import { PublicExplorer, type SearchParams } from "@/features/publications/public-explorer";
import { requireUser } from "@/features/auth/server";
export const metadata = { title: "Inicio" };
export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser("/inicio");
  return <><Hero student/><PublicExplorer params={await searchParams}/></>;
}
