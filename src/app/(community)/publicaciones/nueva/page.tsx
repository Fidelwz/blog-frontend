import { requireUser } from "@/features/auth/server";
import { getCategories } from "@/features/publications/server";
import { PublicationForm } from "@/features/publications/publication-form";
export default async function CreatePublication() {
  const user = await requireUser("/publicaciones/nueva");
  return <PublicationForm ownerId={String(user.id)} categories={await getCategories()}/>;
}
