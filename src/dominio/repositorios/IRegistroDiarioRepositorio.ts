import type {
  RegistroDiario,
  ComidaConsumida,
  ActividadFisica,
} from "../entidades/RegistroDiario";

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
  obtenerPorPacienteYFecha(pacienteId: string, fecha: Date): Promise<RegistroDiario | null>;
  /** Registros del rango [desde, hasta], orden ascendente por fecha. */
  listarPorRango(pacienteId: string, desde: Date, hasta: Date): Promise<RegistroDiario[]>;
  /** Cantidad total de registros del paciente (¿inició su diario?). */
  contarRegistros(pacienteId: string): Promise<number>;

  agregarComida(registroId: string, comida: ComidaConsumida): Promise<void>;
  eliminarComida(comidaId: string): Promise<void>;
  obtenerComida(comidaId: string): Promise<HijoDiario | null>;

  agregarActividad(registroId: string, actividad: ActividadFisica): Promise<void>;
  eliminarActividad(actividadId: string): Promise<void>;
  obtenerActividad(actividadId: string): Promise<HijoDiario | null>;
}
