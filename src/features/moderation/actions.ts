'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/features/auth/server';
import { groupRequest } from '@/features/groups/server';
import { contentId } from '@/features/publications/adapters';
import { ApiError } from '@/lib/api/client';
export async function moderate(_previous: string, form: FormData): Promise<string> {
  const user = await requireUser('/moderacion');
  if (String(user.id) !== form.get('owner')) return 'La cuenta cambió. Recarga para continuar.';
  try {
    const id = contentId(form.get('id')), kind = form.get('kind'), decision = String(form.get('decision')), observation = String(form.get('observation') ?? '').trim();
    if (kind === 'report') {
      if (!['desestimado','contenido_retirado','usuario_suspendido'].includes(decision) || observation.length < 5 || observation.length > 1000) return 'Revisa la decisión y escribe una observación de 5 a 1000 caracteres.';
      if (decision === 'usuario_suspendido' && observation.length > 500) return 'Para una suspensión, el motivo admite como máximo 500 caracteres.';
      await groupRequest(`/moderation/reports/${id}`,{ method:'PATCH',expected:204,body:{ decision,observation,...(decision === 'usuario_suspendido' ? { suspensionDays:Number(form.get('days')) } : {}) } });
    } else {
      const type = form.get('type');
      if (!['post','comment'].includes(String(type)) || !['publish','remove'].includes(decision) || observation.length > 1000) return 'Revisa la decisión.';
      await groupRequest(`/moderation/retained/${type}/${id}`,{ method:'PATCH',expected:204,body:{ decision, ...(observation ? { observation } : {}), ...(type === 'post' ? { version:Number(form.get('version')) } : {}) } });
    }
  } catch(e) {
    if (e instanceof ApiError && e.status === 409) return 'El contenido cambió o ya fue revisado. Recarga la cola; conservamos tu observación.';
    if (e instanceof ApiError && [403,404].includes(e.status)) return 'Tu permiso o el contenido cambió. Recarga la cola.';
    return 'No pudimos confirmar la decisión. Comprueba el estado antes de volver a enviarla.';
  }
  revalidatePath('/moderacion'); revalidatePath('/grupos','layout'); revalidatePath('/publicaciones','layout'); revalidatePath('/inicio'); revalidatePath('/notificaciones');
  return 'Decisión guardada.';
}
