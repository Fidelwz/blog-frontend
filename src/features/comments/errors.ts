import { ApiError } from '../../lib/api/client.ts';

export function conversationError(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No pudimos confirmar la operación. Comprueba la conversación antes de volver a enviar.';
  const messages: Record<number, string> = {
    400: 'Revisa el texto y el comentario al que respondes.',
    401: 'Tu sesión venció. Inicia sesión para continuar.',
    403: 'No tienes permiso para esta acción o tu cuenta está suspendida.',
    404: 'El comentario o la publicación ya no está disponible.',
    409: 'La operación entra en conflicto con el estado actual. Actualiza la conversación.',
    429: 'Alcanzaste el límite de solicitudes. Espera antes de volver a intentarlo.',
  };
  return (messages[error.status] ?? 'No pudimos completar la operación. Inténtalo más tarde.')
    + (error.retryAfter ? ` Espera ${error.retryAfter} segundos.` : '')
    + (error.correlationId ? ` Referencia: ${error.correlationId}` : '');
}
