/** Contrato de paginación de Fase 2, figura 54. IDs serializados como string. */
export type Id = string;
export interface Pagina<T> { elementos: T[]; siguienteCursor: string | null }
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  mensaje: string;
  ruta?: string;
  fecha?: string;
  idCorrelacion?: string;
}
export type RolGlobal = "usuario" | "administrador";
export type RolGrupo = "miembro" | "moderador" | "administrador";
export type EstadoContenido = "visible" | "retenido" | "eliminado";
