import type { Notificacion, TipoNotificacion } from "../entidades/Notificacion";

/**
 * Contrato del repositorio de notificaciones del consultorio.
 *
 * ES tabla de inquilino (`nutricionistaId`), así que la extensión de Prisma le
 * pone el filtro sola y ninguna de estas firmas lo recibe. Por lo mismo,
 * `Notificacion` tiene que figurar en `MODELOS_INQUILINO`: sin eso, las
 * consultas por id cruzarían avisos entre consultorios.
 */
export interface INotificacionRepositorio {
  crear(notificacion: Notificacion): Promise<Notificacion>;
  obtenerPorId(id: string): Promise<Notificacion | null>;
  /**
   * El aviso todavía SIN VER de ese paciente y ese tipo, si lo hay.
   *
   * Lo usa el agrupado: cinco mensajes seguidos del mismo paciente tienen que
   * dejar una línea en la campana, no cinco. Solo mira los no vistos a
   * propósito —uno ya visto es historia y no se pisa—.
   */
  obtenerNoVistaDe(
    pacienteId: string,
    tipo: TipoNotificacion,
  ): Promise<Notificacion | null>;
  /** Reescribe el detalle y la fecha de un aviso pendiente (ver `refrescar`). */
  actualizar(notificacion: Notificacion): Promise<void>;
  /** Las más nuevas primero, vistas y no vistas, acotadas por `limite`. */
  listarRecientes(limite: number): Promise<Notificacion[]>;
  /** Cuántas están sin ver: es el número del globo de la campana. */
  contarNoVistas(): Promise<number>;
  marcarVista(id: string, vistoEn: Date): Promise<void>;
  /** "Marcar todas como vistas". Devuelve cuántas cambiaron. */
  marcarTodasVistas(vistoEn: Date): Promise<number>;
}
