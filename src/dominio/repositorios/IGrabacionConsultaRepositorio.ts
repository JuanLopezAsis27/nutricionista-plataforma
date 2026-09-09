import type { GrabacionConsulta } from "../entidades/GrabacionConsulta";
import type { ResumenConsulta } from "../entidades/ResumenConsulta";

/**
 * Contrato de persistencia de las grabaciones de consulta y su resumen
 * (puerto de salida).
 *
 * El resumen entra en el MISMO repositorio y no en uno propio porque no tiene
 * vida sin las grabaciones: se genera de ellas, se invalida con ellas y se lee
 * siempre junto a ellas. Partirlo en dos habría dado dos repositorios que nadie
 * usa por separado.
 */
export interface IGrabacionConsultaRepositorio {
  /**
   * Crea la grabación y le vincula el audio ya subido, en una sola operación.
   *
   * El archivo se sube ANTES de que exista la fila —no hay id hasta guardarla—,
   * así que si esto falla el audio queda huérfano y lo levanta el barrido
   * semanal del bucket. Vincularlo acá adentro es lo que acota esa ventana.
   */
  crear(
    grabacion: GrabacionConsulta,
    archivoId: string,
  ): Promise<GrabacionConsulta>;
  guardar(grabacion: GrabacionConsulta): Promise<GrabacionConsulta>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<GrabacionConsulta | null>;
  /** Grabaciones del turno, en `orden` ascendente. */
  listarPorTurno(turnoId: string): Promise<GrabacionConsulta[]>;
  /** Siguiente `orden` libre del turno (1 si no hay ninguna). */
  siguienteOrden(turnoId: string): Promise<number>;
  /**
   * A qué consultorio pertenece una grabación. Se llama en alcance GLOBAL: es
   * lo que el worker necesita saber antes de poder fijar el alcance, y por eso
   * no puede resolverse con el alcance ya puesto.
   */
  obtenerInquilinoGlobal(id: string): Promise<string | null>;
  /**
   * Grabaciones pendientes de transcribir de TODOS los inquilinos, para el
   * barrido de rescate del worker. También en alcance global.
   */
  listarPendientesGlobal(
    limite: number,
  ): Promise<{ id: string; nutricionistaId: string }[]>;

  // --- Resumen del turno ---
  obtenerResumen(turnoId: string): Promise<ResumenConsulta | null>;
  /** Crea o reemplaza el resumen del turno (hay uno solo). */
  guardarResumen(resumen: ResumenConsulta): Promise<ResumenConsulta>;
}
