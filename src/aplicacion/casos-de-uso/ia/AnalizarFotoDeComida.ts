import type { IHistorialIARepositorio } from "@/dominio/repositorios/IHistorialIARepositorio";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type {
  IAnalisisComidaIA,
  ResultadoAnalisisComida,
} from "@/dominio/servicios/IAnalisisComidaIA";
import { AnalisisComida } from "@/dominio/entidades/AnalisisComida";
import { ErrorArchivoNoEncontrado } from "@/dominio/errores/ErrorArchivoNoEncontrado";

/** Datos para analizar una foto de comida. */
export interface DatosAnalizarComida {
  pacienteId: string;
  archivoId?: string | null;
  descripcion?: string;
}

/**
 * Caso de uso: analizar una foto de comida y guardar el resultado. Delega en
 * el puerto de visión y persiste el análisis como historial (señal para el ML).
 *
 * El `archivoId` se traduce acá a la CLAVE del objeto en el bucket, que es lo
 * único que el puerto de visión sabe leer. Antes no se traducía —el caso de uso
 * recibía un `archivoClave` que nadie completaba nunca— y el efecto era que la
 * foto jamás llegaba al modelo: se le pedía estimar los macros de una comida
 * mandándole solo la descripción escrita, o directamente nada.
 */
export class AnalizarFotoDeComida {
  constructor(
    private readonly analizador: IAnalisisComidaIA,
    private readonly historial: IHistorialIARepositorio,
    private readonly archivos: IArchivoRepositorio,
  ) {}

  async ejecutar(datos: DatosAnalizarComida): Promise<ResultadoAnalisisComida> {
    let archivoClave: string | undefined;
    if (datos.archivoId) {
      const archivo = await this.archivos.obtenerPorId(datos.archivoId);
      if (!archivo) throw new ErrorArchivoNoEncontrado(datos.archivoId);
      archivoClave = archivo.clave;
    }

    const resultado = await this.analizador.analizar({
      archivoClave,
      descripcion: datos.descripcion,
    });

    await this.historial.guardarAnalisis(
      AnalisisComida.crear(
        {
          pacienteId: datos.pacienteId,
          archivoId: datos.archivoId ?? null,
          resultado,
        },
        crypto.randomUUID(),
      ),
    );

    return resultado;
  }
}
