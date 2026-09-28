import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";

/** Otra tabla que guarda claves del bucket sin ser un `Archivo`. */
export type FuenteDeClaves = Pick<
  IAlimentoPropioRepositorio,
  "listarClavesDeImagen"
>;

/** Resultado de la limpieza: cuántos objetos huérfanos se eliminaron. */
export interface ResultadoLimpieza {
  objetosEliminados: number;
}

/**
 * Caso de uso: eliminar del bucket los objetos que no tienen fila de
 * metadatos (huérfanos que dejan las compensaciones fallidas). Lo ejecuta
 * el worker en un cron semanal.
 *
 * «Tiene fila» no es solo tener un `Archivo`: las imágenes de los alimentos
 * (migración 84) son claves guardadas en la fila del alimento, porque un
 * alimento de la plataforma no es de ningún consultorio y `archivos` sí. Esas
 * tablas llegan como `otrasFuentes`; olvidarse de una acá borraría todas sus
 * imágenes el domingo siguiente, sin ningún error.
 */
export class LimpiarArchivosHuerfanos {
  constructor(
    private readonly archivos: IArchivoRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
    private readonly otrasFuentes: FuenteDeClaves[] = [],
  ) {}

  async ejecutar(): Promise<ResultadoLimpieza> {
    const [clavesBucket, clavesRegistradas, ...otras] = await Promise.all([
      this.almacenamiento.listarClaves(),
      this.archivos.listarClaves(),
      ...this.otrasFuentes.map((f) => f.listarClavesDeImagen()),
    ]);

    const registradas = new Set([...clavesRegistradas, ...otras.flat()]);
    const huerfanas = clavesBucket.filter((clave) => !registradas.has(clave));

    for (const clave of huerfanas) {
      await this.almacenamiento.eliminar(clave);
    }

    return { objetosEliminados: huerfanas.length };
  }
}
