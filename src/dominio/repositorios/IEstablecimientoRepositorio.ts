import type { Establecimiento } from "../entidades/Establecimiento";

/**
 * Contrato de persistencia de los establecimientos del consultorio.
 *
 * `listar` devuelve solo los vigentes por defecto: la baja es lógica y las
 * sedes cerradas solo importan para leer el histórico, no para elegir dónde
 * agendar.
 */
export interface IEstablecimientoRepositorio {
  obtenerPorId(id: string): Promise<Establecimiento | null>;
  /** Ordenados por `orden` y después por nombre. */
  listar(opciones?: {
    incluirArchivados?: boolean;
  }): Promise<Establecimiento[]>;
  /** El principal vigente, o null si el consultorio todavía no tiene ninguno. */
  obtenerPrincipal(): Promise<Establecimiento | null>;
  crear(establecimiento: Establecimiento): Promise<Establecimiento>;
  actualizar(establecimiento: Establecimiento): Promise<Establecimiento>;
  /**
   * Marca uno como principal y desmarca al resto, en una transacción.
   *
   * Va acá y no en dos llamadas del caso de uso porque hay un índice único
   * parcial (`establecimientos_uno_principal_uk`): desmarcar y marcar por
   * separado deja un instante con dos principales que la base rechaza.
   */
  fijarPrincipal(id: string): Promise<void>;
  /**
   * ¿Ya hay una sede VIGENTE con ese nombre? El archivado no cuenta: si
   * contara, una sede cerrada bloquearía su nombre para siempre.
   */
  existeNombre(nombre: string, excluirId?: string): Promise<boolean>;
  /** ¿Hay algún turno dado en esta sede? Decide si se puede archivar. */
  tieneTurnos(id: string): Promise<boolean>;
}
