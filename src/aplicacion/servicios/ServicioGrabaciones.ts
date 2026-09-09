import type { RegistrarGrabacion } from "@/aplicacion/casos-de-uso/grabaciones/RegistrarGrabacion";
import type {
  ObtenerGrabacionesDeTurno,
  ConsultaGrabada,
} from "@/aplicacion/casos-de-uso/grabaciones/ObtenerGrabacionesDeTurno";
import type { EliminarGrabacion } from "@/aplicacion/casos-de-uso/grabaciones/EliminarGrabacion";
import type { ReintentarTranscripcion } from "@/aplicacion/casos-de-uso/grabaciones/ReintentarTranscripcion";
import type {
  TranscribirGrabacion,
  ResultadoTranscripcion,
} from "@/aplicacion/casos-de-uso/grabaciones/TranscribirGrabacion";
import type { GenerarResumenConsulta } from "@/aplicacion/casos-de-uso/grabaciones/GenerarResumenConsulta";
import type { IGrabacionConsultaRepositorio } from "@/dominio/repositorios/IGrabacionConsultaRepositorio";
import type { ITranscriptorAudio } from "@/dominio/servicios/ITranscriptorAudio";
import type { GrabacionConsulta } from "@/dominio/entidades/GrabacionConsulta";
import type {
  ConsultaGrabadaDto,
  GrabacionSalidaDto,
  RegistrarGrabacionDto,
} from "../dtos/grabacion.dto";

/**
 * Servicio de aplicación de las grabaciones de consulta.
 *
 * Tiene dos clientes con necesidades distintas y por eso conviven dos familias
 * de métodos: los de la PANTALLA (devuelven DTOs) y los del WORKER (devuelven
 * el resultado del intento, para loguearlo). El worker no consume DTOs porque
 * no dibuja nada.
 */
export class ServicioGrabaciones {
  constructor(
    private readonly registrarUC: RegistrarGrabacion,
    private readonly obtenerUC: ObtenerGrabacionesDeTurno,
    private readonly eliminarUC: EliminarGrabacion,
    private readonly reintentarUC: ReintentarTranscripcion,
    private readonly transcribirUC: TranscribirGrabacion,
    private readonly resumirUC: GenerarResumenConsulta,
    private readonly repositorio: IGrabacionConsultaRepositorio,
    private readonly transcriptor: ITranscriptorAudio,
  ) {}

  // --- Pantalla ---

  async registrar(datos: RegistrarGrabacionDto): Promise<GrabacionSalidaDto> {
    return aSalida(await this.registrarUC.ejecutar(datos));
  }

  async obtenerDeTurno(turnoId: string): Promise<ConsultaGrabadaDto> {
    const [consulta, transcripcionActiva] = await Promise.all([
      this.obtenerUC.ejecutar(turnoId),
      this.transcriptor.estaConfigurado(),
    ]);
    return { ...aSalidaConsulta(consulta), transcripcionActiva };
  }

  async eliminar(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  async reintentar(id: string): Promise<GrabacionSalidaDto> {
    return aSalida(await this.reintentarUC.ejecutar(id));
  }

  /** Regenera el resumen a pedido, aunque ya esté al día. */
  async regenerarResumen(turnoId: string): Promise<ConsultaGrabadaDto> {
    await this.resumirUC.ejecutar(turnoId);
    return this.obtenerDeTurno(turnoId);
  }

  // --- Worker ---

  /**
   * Transcribe y, si salió bien, refresca el resumen de la consulta.
   *
   * El resumen se genera acá y no en un trabajo aparte porque depende de que la
   * transcripción haya terminado: encolarlo por separado obligaría a coordinar
   * dos colas para una secuencia que siempre es la misma.
   *
   * Que el resumen falle NO vuelve fallida la transcripción: el texto ya está
   * guardado y es lo que de verdad importa conservar.
   */
  async transcribir(grabacionId: string): Promise<ResultadoTranscripcion> {
    const resultado = await this.transcribirUC.ejecutar(grabacionId);
    if (resultado.estado !== "TRANSCRITA") return resultado;

    const grabacion = await this.repositorio.obtenerPorId(grabacionId);
    if (grabacion) {
      await this.resumirUC
        .ejecutar(grabacion.turnoId, { soloSiFalta: true })
        .catch((error: unknown) => {
          console.error(
            `[grabaciones] no se pudo resumir el turno ${grabacion.turnoId}:`,
            error,
          );
        });
    }
    return resultado;
  }

  /** Pendientes de todos los consultorios, para el barrido de rescate. */
  pendientesGlobal(
    limite: number,
  ): Promise<{ id: string; nutricionistaId: string }[]> {
    return this.repositorio.listarPendientesGlobal(limite);
  }

  /** A qué consultorio pertenece una grabación (alcance global). */
  inquilinoDe(grabacionId: string): Promise<string | null> {
    return this.repositorio.obtenerInquilinoGlobal(grabacionId);
  }
}

function aSalida(grabacion: GrabacionConsulta): GrabacionSalidaDto {
  const p = grabacion.aPrimitivos();
  return {
    id: p.id,
    turnoId: p.turnoId,
    orden: p.orden,
    duracionSegundos: p.duracionSegundos,
    estado: p.estado,
    transcripcion: p.transcripcion,
    error: p.error,
    intentos: p.intentos,
    transcritoEn: p.transcritoEn,
    creadoEn: p.creadoEn,
    archivoId: p.archivoId,
    nombreArchivo: p.nombreArchivo,
    mimeType: p.mimeType,
    tamanoBytes: p.tamanoBytes,
  };
}

function aSalidaConsulta(
  consulta: ConsultaGrabada,
): Omit<ConsultaGrabadaDto, "transcripcionActiva"> {
  const resumen = consulta.resumen?.aPrimitivos() ?? null;
  return {
    grabaciones: consulta.grabaciones.map(aSalida),
    resumen:
      resumen == null
        ? null
        : {
            texto: resumen.texto,
            modelo: resumen.modelo,
            grabacionesIncluidas: resumen.grabacionesIncluidas,
            generadoEn: resumen.generadoEn,
          },
    resumenDesactualizado: consulta.resumenDesactualizado,
  };
}
