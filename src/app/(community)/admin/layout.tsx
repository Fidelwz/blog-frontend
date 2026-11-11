import { AdminAccessBoundary } from '@/features/admin/access-boundary';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/features/auth/server';
export const metadata = {title:'Administración global',robots:{index:false,follow:false}};
export default async function AdminLayout({children}:{children:React.ReactNode}) {
  const user = await requireUser('/admin');
  if(user.role!=='administrador') notFound();
  return <AdminAccessBoundary owner={String(user.id)}><section className="mx-auto max-w-6xl space-y-6 p-4 md:p-8"><h1 className="text-3xl font-bold">Administración global</h1><nav className="flex gap-5"><Link href="/admin">Resumen</Link><Link href="/admin/usuarios">Usuarios</Link><Link href="/admin/publicaciones">Publicaciones</Link><Link href="/moderacion">Moderación</Link><Link href="/moderacion?view=retained">Retenidos</Link></nav>{children}</section></AdminAccessBoundary>;
}
