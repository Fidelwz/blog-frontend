import { requireUser } from '@/features/auth/server';
import { NotificationInbox } from '@/features/notifications/inbox';
export const metadata = { title:'Notificaciones',robots:{index:false,follow:false} };
export default async function Notifications() {
  const user = await requireUser('/notificaciones');
  return <section className="mx-auto max-w-3xl space-y-6 p-4 md:p-8"><header><h1 className="text-3xl font-bold">Notificaciones</h1><p className="mt-2 text-slate-500">Sigue tus conversaciones y la actividad de tus grupos.</p></header><NotificationInbox owner={String(user.id)}/></section>;
}
