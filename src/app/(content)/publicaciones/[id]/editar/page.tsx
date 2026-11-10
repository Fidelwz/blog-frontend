import { requireUser } from "@/features/auth/server";
import { getPost } from "@/features/publications/detail-server";
import { getCategories } from "@/features/publications/server";
import { PublicationForm } from "@/features/publications/publication-form";
import { Notice } from "@/components/notice";
export default async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/publicaciones/${id}/editar`);
  const result = await getPost(id);
  if (result.kind !== "ok" || result.post.authorId !== String(user.id)) return <Notice>No tienes permiso para editar esta publicación.</Notice>;
  return <PublicationForm ownerId={String(user.id)} post={result.post} categories={await getCategories()}/>;
}
