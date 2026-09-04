import type { CampoEvolucion } from "../entidades/CampoEvolucion";

/**
 * Contrato de persistencia de los campos personalizados que el consultorio
 * agrega a las evoluciones (uno por inquilino, no por paciente).
 */
export interface ICampoEvolucionRepositorio {
  obtenerTodos(): Promise<CampoEvolucion[]>;
  obtenerPorId(id: string): Promise<CampoEvolucion | null>;
  /** Busca por nombre para no dar de alta dos campos que se llaman igual. */
  obtenerPorNombre(nombre: string): Promise<CampoEvolucion | null>;
  crear(campo: CampoEvolucion): Promise<CampoEvolucion>;
  actualizar(campo: CampoEvolucion): Promise<CampoEvolucion>;
  eliminar(id: string): Promise<void>;
}
