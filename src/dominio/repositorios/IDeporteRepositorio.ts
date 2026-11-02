import type { Deporte } from "../entidades/Deporte";

/**
 * Contrato de persistencia de la lista de deportes de la plataforma
 * (migración 97). No es tabla de inquilino: la leen todos los consultorios y
 * la escribe solo el SUPERADMIN.
 */
export interface IDeporteRepositorio {
  crear(deporte: Deporte): Promise<Deporte>;
  /** Escribe el nombre (y su clave). */
  actualizar(deporte: Deporte): Promise<Deporte>;
  /** Falla en la base si algún perfil lo usa (RESTRICT): el caso de uso lo mira antes. */
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<Deporte | null>;
  /** Por nombre. */
  listar(): Promise<Deporte[]>;
  /**
   * ¿Ya hay uno con ese nombre (`claveNombre`)? `excluirId` deja
   * renombrarse a sí mismo.
   */
  existeNombre(claveNombre: string, excluirId?: string): Promise<boolean>;
}
