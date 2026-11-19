import Link from 'next/link';
import { requireUser } from '@/features/auth/server';
import { getCategories } from '@/features/publications/server';
import { GroupForm } from '@/features/groups/forms';
export const metadata = { title: 'Crear grupo' };
export default async function CreateGroup() {
  const user = await requireUser('/grupos/crear');
  const categories = await getCategories();
  return <section className="mx-auto max-w-3xl space-y-5"><Link href="/grupos" className="back-link">Cancelar y volver a grupos</Link><h1>Crear grupo de estudio</h1><p className="text-muted-foreground">Elige una materia y prepara un espacio para aprender con tus compañeros.</p><GroupForm owner={String(user.id)} categories={categories}/></section>;
}
