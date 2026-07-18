import type { AlertaSeguimiento } from "../entidades/AlertaSeguimiento";

/**
 * Contrato de persistencia de las alertas de seguimiento.
 * La creación es idempotente por (paciente, tipo, referencia): el cron corre
 * todos los días y no debe duplicar avisos todavía pendientes.
 */
export interface IAlertaSeguimientoRepositorio {
  /**
   * Crea la alerta salvo que ya exista una PENDIENTE del mismo paciente,
   * tipo y referencia. Devuelve true si la creó.
   */
  crearSiNoExistePendiente(alerta: AlertaSeguimiento): Promise<boolean>;
  actualizar(alerta: AlertaSeguimiento): Promise<AlertaSeguimiento>;
  obtenerPorId(id: string): Promise<AlertaSeguimiento | null>;
  /** Alertas pendientes, más recientes primero (con nombre del paciente). */
  listarPendientes(): Promise<AlertaSeguimiento[]>;
  contarPendientes(): Promise<number>;
}
