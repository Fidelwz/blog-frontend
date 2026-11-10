import { requireUser } from "@/features/auth/server";
import { MyPublications } from "@/features/publications/my-publications";
import { parseMyPostsQuery } from "@/features/publications/validation";
import { Notice } from "@/components/notice";

export default async function MyPublicationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/mis-publicaciones");
  const params = await searchParams;
  let status: string;
  try {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
    status = parseMyPostsQuery(query).get("status") ?? "";
  } catch { return <Notice kind="error">El filtro no es válido. Usa visible, retenida o eliminada.</Notice>; }
  return <MyPublications ownerId={String(user.id)} status={status}/>;
}
