import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";

/** Resultado de la limpieza: cuántos objetos huérfanos se eliminaron. */
export interface ResultadoLimpieza {
  objetosEliminados: number;
}

/**
 * Caso de uso: eliminar del bucket los objetos que no tienen fila de
 * metadatos (huérfanos que dejan las compensaciones fallidas). Lo ejecuta
 * el worker en un cron semanal.
 */
export class LimpiarArchivosHuerfanos {
  constructor(
    private readonly archivos: IArchivoRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
  ) {}

  async ejecutar(): Promise<ResultadoLimpieza> {
    const [clavesBucket, clavesRegistradas] = await Promise.all([
      this.almacenamiento.listarClaves(),
      this.archivos.listarClaves(),
    ]);

    const registradas = new Set(clavesRegistradas);
    const huerfanas = clavesBucket.filter((clave) => !registradas.has(clave));

    for (const clave of huerfanas) {
      await this.almacenamiento.eliminar(clave);
    }

    return { objetosEliminados: huerfanas.length };
  }
}
