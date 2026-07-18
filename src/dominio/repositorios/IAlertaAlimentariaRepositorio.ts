import type { AlertaAlimentaria } from "../entidades/AlertaAlimentaria";

/** Contrato de persistencia para las alertas alimentarias. */
export interface IAlertaAlimentariaRepositorio {
  crear(alerta: AlertaAlimentaria): Promise<AlertaAlimentaria>;
  actualizar(alerta: AlertaAlimentaria): Promise<AlertaAlimentaria>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<AlertaAlimentaria | null>;
  listarPorPaciente(pacienteId: string): Promise<AlertaAlimentaria[]>;
}
