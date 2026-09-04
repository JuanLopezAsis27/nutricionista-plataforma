import type { Evolucion } from "../entidades/Evolucion";

/** Contrato de persistencia de las evoluciones de control del paciente. */
export interface IEvolucionRepositorio {
  crear(evolucion: Evolucion): Promise<Evolucion>;
  actualizar(evolucion: Evolucion): Promise<Evolucion>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<Evolucion | null>;
  /** Evoluciones del paciente ordenadas por fecha DESCENDENTE (la última primero). */
  listarPorPaciente(pacienteId: string): Promise<Evolucion[]>;
  /** ¿Existe otra evolución del paciente en esa fecha? (excluirId para ediciones). */
  existeEnFecha(
    pacienteId: string,
    fecha: Date,
    excluirId?: string,
  ): Promise<boolean>;
}
