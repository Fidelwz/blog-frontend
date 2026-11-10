'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/features/auth/server';
import { ApiError } from '@/lib/api/client';
import { contentId } from '@/features/publications/adapters';
import { parseGroup } from './adapters';
import { groupRequest } from './server';
export async function changeGroup(_previous: string, form: FormData): Promise<string> {
  const user = await requireUser('/grupos');
  if (String(user.id) !== form.get('owner')) return 'La cuenta cambió. Recarga antes de continuar.';
  let destination = '/grupos';
  try {
    const action = form.get('action');
    if (action === 'create') {
      const name = String(form.get('name') ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
      const description = String(form.get('description') ?? '').trim();
      if (name.length < 3 || name.length > 100 || description.length > 1000) return 'Revisa el nombre (3–100 caracteres) y la descripción (máximo 1000).';
      const body = { name, description, categoryId: contentId(form.get('categoryId')) };
      const group = parseGroup(await (await groupRequest('/groups', { method: 'POST', body, expected: 201 })).json());
      destination = `/grupos/${group.id}`;
    } else if (action === 'join' || action === 'leave') {
      const id = contentId(form.get('id'));
      await groupRequest(`/groups/${id}/members${action === 'leave' ? '/me' : ''}`, { method: action === 'leave' ? 'DELETE' : 'POST', expected: action === 'leave' ? 204 : 201 });
      destination = `/grupos/${id}`;
      revalidatePath(destination);
    } else return 'Acción inválida.';
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) return 'Ya perteneces al grupo o eres su último administrador. Recarga para comprobar tu membresía; para salir como último administrador debes transferirla primero.';
    if (error instanceof ApiError && error.status === 403) return 'Ya no tienes permiso para esta acción. Recarga el grupo.';
    return 'No se pudo confirmar la operación. Comprueba el catálogo y tu membresía antes de repetirla.';
  }
  revalidatePath('/grupos'); revalidatePath('/mis-publicaciones'); revalidatePath('/perfil');
  redirect(destination);
}
