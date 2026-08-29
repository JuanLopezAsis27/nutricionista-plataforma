import type {
  Objetivo,
  EstrategiaObjetivo,
  EventoObjetivo,
  TipoEventoObjetivo,
} from "../entidades/Objetivo";

/**
 * Evento de auditoría a registrar junto con una operación (el repositorio
 * lo persiste en la MISMA transacción que el cambio).
 */
export interface DatosEventoObjetivo {
  tipo: TipoEventoObjetivo;
  detalle: string;
  motivo?: string | null;
}

/**
 * Contrato del repositorio de Objetivos (puerto de salida del dominio).
 *
 * Cada mutación recibe el evento de historial: la auditoría la deciden los
 * casos de uso, nunca la UI, y se guarda atómica con el cambio.
 */
export interface IObjetivoRepositorio {
  crear(objetivo: Objetivo, evento: DatosEventoObjetivo): Promise<Objetivo>;
  /** Actualiza los escalares (las estrategias se gestionan aparte). */
  actualizar(
    objetivo: Objetivo,
    evento: DatosEventoObjetivo,
  ): Promise<Objetivo>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<Objetivo | null>;
  /** Objetivos del paciente (con estrategias), más recientes primero. */
  listarPorPaciente(pacienteId: string): Promise<Objetivo[]>;

  // --- Estrategias (hijos) ---
  agregarEstrategia(
    objetivoId: string,
    estrategia: EstrategiaObjetivo,
    evento: DatosEventoObjetivo,
  ): Promise<void>;
  actualizarEstrategia(
    objetivoId: string,
    estrategia: EstrategiaObjetivo,
    evento: DatosEventoObjetivo,
  ): Promise<void>;
  eliminarEstrategia(
    objetivoId: string,
    estrategiaId: string,
    evento: DatosEventoObjetivo,
  ): Promise<void>;

  // --- Historial ---
  /** Eventos del objetivo, más recientes primero. */
  listarHistorial(objetivoId: string): Promise<EventoObjetivo[]>;
}
