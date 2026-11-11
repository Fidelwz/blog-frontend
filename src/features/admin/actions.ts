'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/features/auth/server';
import { groupRequest } from '@/features/groups/server';
import { contentId } from '@/features/publications/adapters';
export async function changeSuspension(_:string,form:FormData) {
 const user=await requireUser('/admin/usuarios');
 if(user.role!=='administrador'||String(user.id)!==form.get('owner'))return 'Tu cuenta o tus permisos cambiaron.';
 try {
 const id=contentId(form.get('id')), action=form.get('action');
 if(!['suspend','reactivate'].includes(String(action)))return 'Acción inválida.';
 await groupRequest(`/admin/users/${id}/suspension`,{method:action==='suspend'?'PATCH':'DELETE',expected:204,...(action==='suspend'?{body:{days:Number(form.get('days')),reason:String(form.get('reason')??'').trim()}}:{})});
 }catch{return 'No se pudo confirmar el cambio. Comprueba el estado antes de reintentar.';}
 revalidatePath('/admin','layout');return 'Cambio guardado.';
}
