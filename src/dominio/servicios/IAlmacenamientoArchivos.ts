/**
 * Puerto de almacenamiento de objetos (bucket S3-compatible).
 * El dominio solo conoce esta interfaz; la implementación concreta
 * (MinIO en desarrollo, S3/R2 en producción) vive en infraestructura.
 */
/** Un objeto del bucket abierto para leerlo como flujo. */
export interface LecturaArchivo {
  contenido: ReadableStream<Uint8Array>;
  /** El tamaño que informa el bucket, si lo informa (para `Content-Length`). */
  tamanoBytes: number | null;
}

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

  /**
   * El objeto como flujo, para pasarlo al navegador a medida que llega.
   *
   * `descargar` junta el objeto entero en memoria antes de devolverlo: con el
   * bucket en el mismo servidor no se nota, pero con un bucket en la nube el
   * navegador espera a que termine esa bajada completa antes de recibir el
   * primer byte (≈0,7 s más para un PDF de 24 MB contra OVH). Con el flujo, la
   * bajada desde el bucket y la subida al navegador corren a la vez.
   *
   * Lanza si el objeto no existe; los fallos a mitad de camino llegan como
   * error del flujo.
   */
  abrirLectura(clave: string): Promise<LecturaArchivo>;

  /** Elimina el objeto. No falla si la clave no existe. */
  eliminar(clave: string): Promise<void>;

  /** Claves existentes bajo un prefijo (para limpieza de huérfanos). */
  listarClaves(prefijo?: string): Promise<string[]>;
}
