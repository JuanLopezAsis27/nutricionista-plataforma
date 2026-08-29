/**
 * Puerto de almacenamiento de objetos (bucket S3-compatible).
 * El dominio solo conoce esta interfaz; la implementación concreta
 * (MinIO en desarrollo, S3/R2 en producción) vive en infraestructura.
 */
export interface IAlmacenamientoArchivos {
  /** Sube el contenido bajo la clave dada. Sobrescribe si ya existe. */
  subir(clave: string, contenido: Uint8Array, mimeType: string): Promise<void>;

  /** URL firmada de solo lectura, válida por el tiempo indicado. */
  generarUrlLectura(clave: string, expiraEnSegundos: number): Promise<string>;

  /**
   * Contenido del objeto, para servirlo desde la propia app.
   *
   * Existe además de `generarUrlLectura` porque un visor embebido no puede
   * usar la URL firmada: apunta a otro origen (MinIO/S3) y queda a merced de
   * sus cabeceras y de lo que el navegador —o el WebView de la app Android—
   * permita mostrar en un iframe. Sirviéndolo desde acá el PDF es del mismo
   * origen que la página, y la sesión ya se validó.
   */
  descargar(clave: string): Promise<Uint8Array>;

  /** Elimina el objeto. No falla si la clave no existe. */
  eliminar(clave: string): Promise<void>;

  /** Claves existentes bajo un prefijo (para limpieza de huérfanos). */
  listarClaves(prefijo?: string): Promise<string[]>;
}
