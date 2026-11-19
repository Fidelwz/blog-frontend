'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/features/auth/server';
import { groupRequest } from '@/features/groups/server';
import { contentId } from '@/features/publications/adapters';
import { ApiError } from '@/lib/api/client';
import { plainCommentText } from '@/features/comments/validation';
import { conversationError } from '@/features/comments/errors';
export async function moderate(_previous: string, form: FormData): Promise<string> {
  const user = await requireUser('/moderacion');
  if (String(user.id) !== form.get('owner')) return 'La cuenta cambió. Recarga para continuar.';
  try {
    const id = contentId(form.get('id')), kind = form.get('kind'), decision = String(form.get('decision'));
    const rawObservation = String(form.get('observation') ?? '');
    const observation = plainCommentText(rawObservation,kind === 'report' ? 5 : 0,1000);
    if (kind !== 'report' && kind !== 'retained') return 'Tipo de revisión inválido.';
    if (kind === 'report') {
      if (!['desestimado','contenido_retirado','usuario_suspendido'].includes(decision) || observation.length < 5 || observation.length > 1000) return 'Revisa la decisión y escribe una observación de 5 a 1000 caracteres.';
      if (decision === 'usuario_suspendido' && observation.length > 500) return 'Para una suspensión, el motivo admite como máximo 500 caracteres.';
      const days = Number(form.get('days'));
      if (decision === 'usuario_suspendido' && (user.role !== 'administrador' || !Number.isInteger(days) || days < 1 || days > 90)) return 'Solo un administrador global puede suspender por un período de 1 a 90 días.';
      await groupRequest(`/moderation/reports/${id}`,{ method:'PATCH',expected:204,operation:{ownerId:String(user.id)},body:{ decision,observation:rawObservation,...(decision === 'usuario_suspendido' ? { suspensionDays:days } : {}) } });
    } else {
      const type = form.get('type');
      if (!['post','comment'].includes(String(type)) || !['publish','remove'].includes(decision) || observation.length > 1000) return 'Revisa la decisión.';
      await groupRequest(`/moderation/retained/${type}/${id}`,{ method:'PATCH',expected:204,operation:{ownerId:String(user.id)},body:{ decision, ...(observation ? { observation:rawObservation } : {}), ...(type === 'post' ? { version:Number(form.get('version')) } : {}) } });
    }
  } catch(e) {
    if (e instanceof ApiError && e.status === 409) return 'El contenido cambió o ya fue revisado. Recarga la cola; conservamos tu observación.';
    if (e instanceof ApiError && [403,404].includes(e.status)) return 'Tu permiso o el contenido cambió. Recarga la cola.';
    return conversationError(e);
  }
  revalidatePath('/moderacion','layout'); revalidatePath('/grupos','layout'); revalidatePath('/publicaciones','layout'); revalidatePath('/inicio'); revalidatePath('/notificaciones');
  return 'Decisión guardada.';
}
