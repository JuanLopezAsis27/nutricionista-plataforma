import type {
  RegistroDiario,
  ComidaConsumida,
  ActividadFisica,
} from "../entidades/RegistroDiario";

/** Señales del diario de un paciente dentro de un rango de fechas. */
export interface ResumenDiario {
  /** Registros del paciente en toda su historia (no solo en el rango). */
  totalRegistros: number;
  /** Registró el peso al menos una vez dentro del rango. */
  registroPeso: boolean;
  /** Cargó al menos una actividad física dentro del rango. */
  huboActividad: boolean;
}

/** Hijo del diario con los datos mínimos para autorizar y limpiar fotos. */
export interface HijoDiario {
  id: string;
  registroId: string;
  pacienteId: string;
}

/**
 * Contrato de persistencia para el diario del paciente.
 * Los hijos (comidas, actividades) se agregan y quitan de a uno; la foto de
 * una comida se vincula vía el módulo de Archivos.
 */
export interface IRegistroDiarioRepositorio {
  crear(registro: RegistroDiario): Promise<RegistroDiario>;
  actualizarEscalares(registro: RegistroDiario): Promise<RegistroDiario>;
  obtenerPorPacienteYFecha(
    pacienteId: string,
    fecha: Date,
  ): Promise<RegistroDiario | null>;
  /** Registros del rango [desde, hasta], orden ascendente por fecha. */
  listarPorRango(
    pacienteId: string,
    desde: Date,
    hasta: Date,
  ): Promise<RegistroDiario[]>;
  /** Cantidad total de registros del paciente (¿inició su diario?). */
  contarRegistros(pacienteId: string): Promise<number>;

  /**
   * Resumen del diario de TODOS los pacientes del inquilino en un rango, en una
   * sola lectura. Existe para el barrido nocturno de seguimiento, que antes
   * hacía dos consultas por paciente (~1.600 idas y vueltas con 800 pacientes).
   *
   * Solo aparecen los pacientes que alguna vez usaron el diario: no haber
   * registrado nunca nada no es una señal de abandono.
   */
  resumenPorPacienteEnRango(
    desde: Date,
    hasta: Date,
  ): Promise<Map<string, ResumenDiario>>;

  agregarComida(registroId: string, comida: ComidaConsumida): Promise<void>;
  eliminarComida(comidaId: string): Promise<void>;
  obtenerComida(comidaId: string): Promise<HijoDiario | null>;

  agregarActividad(
    registroId: string,
    actividad: ActividadFisica,
  ): Promise<void>;
  eliminarActividad(actividadId: string): Promise<void>;
  obtenerActividad(actividadId: string): Promise<HijoDiario | null>;
}
