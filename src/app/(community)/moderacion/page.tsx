import { requireUser } from '@/features/auth/server';
import { ModerationQueue } from '@/features/moderation/queue';
export const metadata = { title:'Moderación',robots:{ index:false,follow:false } };
export default async function Moderation({ searchParams }: { searchParams:Promise<Record<string,string|string[]|undefined>> }) {
  const user = await requireUser('/moderacion');
  return <section className="mx-auto max-w-4xl space-y-6 p-4 md:p-8"><h1 className="text-3xl font-bold">Moderación de contenido</h1><p className="text-slate-500">Revisa los reportes y el contenido retenido de los espacios que administras.</p><ModerationQueue owner={String(user.id)} globalAdmin={user.role === 'administrador'} params={await searchParams}/></section>;
}
