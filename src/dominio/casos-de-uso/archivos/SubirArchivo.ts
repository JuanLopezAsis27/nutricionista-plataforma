import type {
  IArchivoRepositorio,
  DuenoArchivo,
} from "../../repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "../../servicios/IAlmacenamientoArchivos";
import { Archivo, type ContextoArchivo } from "../../entidades/Archivo";

/** Datos de entrada para subir un archivo. */
export interface DatosSubirArchivo {
  nombreOriginal: string;
  mimeType: string;
  contenido: Uint8Array;
  contexto: ContextoArchivo;
  titulo?: string | null;
  categoria?: string | null;
  subidoPorId?: string | null;
  /** Dueño directo (ej. archivos de la ficha del paciente). Los adjuntos de
   *  laboratorio se suben sin dueño y se vinculan al registrar el estudio. */
  dueno?: DuenoArchivo;
}

/**
 * Caso de uso: subir un archivo al bucket y registrar sus metadatos.
 *
 * La entidad valida MIME, tamaño y nombre según el contexto. El orden es
 * bucket → base de datos, con compensación: si falla la persistencia de la
 * fila, se elimina el objeto del bucket para no dejar huérfanos.
 */
export class SubirArchivo {
  constructor(
    private readonly archivos: IArchivoRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
  ) {}

  async ejecutar(datos: DatosSubirArchivo): Promise<Archivo> {
    const archivo = Archivo.crear(
      {
        nombreOriginal: datos.nombreOriginal,
        mimeType: datos.mimeType,
        tamanoBytes: datos.contenido.byteLength,
        contexto: datos.contexto,
        titulo: datos.titulo,
        categoria: datos.categoria,
        subidoPorId: datos.subidoPorId,
      },
      crypto.randomUUID(),
    );

    await this.almacenamiento.subir(archivo.clave, datos.contenido, archivo.mimeType);

    try {
      return await this.archivos.crear(archivo, datos.dueno);
    } catch (error) {
      await this.almacenamiento.eliminar(archivo.clave);
      throw error;
    }
  }
}
