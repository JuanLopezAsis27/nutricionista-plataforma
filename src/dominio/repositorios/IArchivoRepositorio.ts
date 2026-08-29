import type { Archivo } from "../entidades/Archivo";

/**
 * Dueño de un archivo (arco exclusivo: exactamente una FK).
 * Cada fase suma dueños posibles (receta, material educativo, etc).
 */
export interface DuenoArchivo {
  pacienteId?: string;
  laboratorioId?: string;
  comidaConsumidaId?: string;
  recetaId?: string;
  materialId?: string;
  planId?: string;
}

/**
 * Contrato de persistencia para los metadatos de archivos.
 * El contenido vive en el bucket (ver IAlmacenamientoArchivos); acá solo
 * se persisten y consultan los metadatos.
 */
export interface IArchivoRepositorio {
  /** Persiste los metadatos, opcionalmente vinculados a un dueño. */
  crear(archivo: Archivo, dueno?: DuenoArchivo): Promise<Archivo>;
  obtenerPorId(id: string): Promise<Archivo | null>;
  eliminar(id: string): Promise<void>;
  listarPorDueno(dueno: DuenoArchivo): Promise<Archivo[]>;
  /** Vincula un archivo ya subido a su dueño definitivo. */
  vincularDueno(id: string, dueno: DuenoArchivo): Promise<void>;
  /** Dueño actual del archivo (todas las FKs en null si está huérfano). */
  obtenerDueno(id: string): Promise<DuenoArchivo | null>;
  /** Todas las claves registradas (para limpieza de huérfanos del bucket). */
  listarClaves(): Promise<string[]>;
}
