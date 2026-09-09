import type { IGrabacionConsultaRepositorio } from "@/dominio/repositorios/IGrabacionConsultaRepositorio";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import type { ITranscriptorAudio } from "@/dominio/servicios/ITranscriptorAudio";
import { ErrorGrabacionNoEncontrada } from "@/dominio/errores/ErrorGrabacionNoEncontrada";

/** Qué pasó con el intento, para que el worker lo pueda loguear. */
export type ResultadoTranscripcion =
  | { estado: "TRANSCRITA"; caracteres: number }
  | { estado: "FALLIDA"; motivo: string; volveraAIntentarse: boolean }
  | { estado: "OMITIDA"; motivo: string };

/**
 * Caso de uso: transcribir el audio de una grabación. Lo ejecuta el worker.
 *
 * **No lanza cuando falla el proveedor**: anota el motivo en la grabación y lo
 * devuelve. Si lanzara, pg-boss reintentaría el trabajo entero con su propia
 * política, en paralelo a la que ya lleva la entidad (`intentos`), y el
 * profesional no vería nunca por qué su grabación no se transcribió — solo una
 * fila que se queda en «pendiente» para siempre. Sí lanza cuando el problema es
 * de datos (la grabación no existe): eso es un error de programa, no un fallo
 * de red.
 */
export class TranscribirGrabacion {
  constructor(
    private readonly grabaciones: IGrabacionConsultaRepositorio,
    private readonly archivos: IArchivoRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
    private readonly transcriptor: ITranscriptorAudio,
  ) {}

  async ejecutar(grabacionId: string): Promise<ResultadoTranscripcion> {
    const grabacion = await this.grabaciones.obtenerPorId(grabacionId);
    if (!grabacion) {
      throw new ErrorGrabacionNoEncontrada(grabacionId);
    }

    // Ya está hecha: el barrido de rescate y el trabajo encolado pueden llegar
    // los dos a la misma grabación, y transcribir de nuevo es pagar dos veces
    // por el mismo audio.
    if (grabacion.estado === "LISTA") {
      return { estado: "OMITIDA", motivo: "Ya estaba transcrita." };
    }

    const datos = grabacion.aPrimitivos();
    if (datos.archivoId == null) {
      // Sin audio no hay nada que transcribir y nunca lo va a haber: el
      // vínculo se crea junto con la fila.
      await this.grabaciones.guardar(
        grabacion.marcarFallida("La grabación no tiene audio asociado."),
      );
      return {
        estado: "FALLIDA",
        motivo: "Sin audio asociado.",
        volveraAIntentarse: false,
      };
    }

    const archivo = await this.archivos.obtenerPorId(datos.archivoId);
    if (!archivo) {
      await this.grabaciones.guardar(
        grabacion.marcarFallida("El audio ya no está en el sistema."),
      );
      return {
        estado: "FALLIDA",
        motivo: "El audio ya no existe.",
        volveraAIntentarse: false,
      };
    }

    // El intento se cuenta ANTES de llamar al proveedor: si el proceso muere en
    // el medio, la grabación no vuelve a la cola para siempre.
    const enCurso = await this.grabaciones.guardar(grabacion.marcarEnCurso());

    try {
      const contenido = await this.almacenamiento.descargar(archivo.clave);
      const texto = await this.transcriptor.transcribir(
        {
          contenido,
          nombreArchivo: archivo.nombreOriginal,
          mimeType: archivo.mimeType,
        },
        {
          idioma: "es",
          contexto:
            "Consulta de nutrición en español rioplatense. Pueden aparecer términos de antropometría (pliegues, perímetros, ISAK), macronutrientes y nombres de suplementos.",
        },
      );

      const lista = enCurso.marcarTranscrita(texto);
      await this.grabaciones.guardar(lista);
      return { estado: "TRANSCRITA", caracteres: texto.trim().length };
    } catch (error) {
      const motivo = error instanceof Error ? error.message : String(error);
      const fallida = enCurso.marcarFallida(motivo);
      await this.grabaciones.guardar(fallida);
      return {
        estado: "FALLIDA",
        motivo,
        volveraAIntentarse: fallida.estado === "PENDIENTE",
      };
    }
  }
}
