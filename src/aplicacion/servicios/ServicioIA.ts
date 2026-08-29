import type { PreguntarAlAsistente } from "@/dominio/casos-de-uso/ia/PreguntarAlAsistente";
import type { AnalizarFotoDeComida } from "@/dominio/casos-de-uso/ia/AnalizarFotoDeComida";
import type { ListarConsultasIA } from "@/dominio/casos-de-uso/ia/ListarConsultasIA";
import type { ObtenerInsightsPredictivos } from "@/dominio/casos-de-uso/ia/ObtenerInsightsPredictivos";
import type { AnalizarConAsistente } from "@/dominio/casos-de-uso/ia/AnalizarConAsistente";
import type { RegistrarRetroalimentacionInsight } from "@/dominio/casos-de-uso/ia/RegistrarRetroalimentacionInsight";
import type {
  RespuestaAsistenteDto,
  ConsultaIASalidaDto,
  ResultadoAnalisisComidaDto,
  InsightPacienteDto,
  FeedbackInsightDto,
} from "../dtos/ia.dto";

/** Estado de activación de la IA (para ocultar los banners de "demostración"). */
export interface EstadoIA {
  /** Chat + análisis de foto respaldados por Claude (clave configurada). */
  asistenteActivo: boolean;
  /** Insights predictivos respaldados por el servicio de ML. */
  insightsActivo: boolean;
}

export interface EstadoIADeps {
  asistenteActivo(): Promise<boolean>;
  insightsActivo: boolean;
}

/**
 * Servicio de aplicación de IA (andamiaje): chatbot del paciente, análisis de
 * fotos de comida e insights predictivos para el nutricionista. Hoy sobre
 * adaptadores stub; a futuro, sobre adaptadores Claude.
 */
export class ServicioIA {
  constructor(
    private readonly preguntarUC: PreguntarAlAsistente,
    private readonly analizarUC: AnalizarFotoDeComida,
    private readonly listarConsultasUC: ListarConsultasIA,
    private readonly insightsUC: ObtenerInsightsPredictivos,
    private readonly analizarConAsistenteUC: AnalizarConAsistente,
    private readonly registrarFeedbackUC: RegistrarRetroalimentacionInsight,
    private readonly estadoDeps: EstadoIADeps,
  ) {}

  async estado(): Promise<EstadoIA> {
    return {
      asistenteActivo: await this.estadoDeps.asistenteActivo(),
      insightsActivo: this.estadoDeps.insightsActivo,
    };
  }

  async preguntar(
    pacienteId: string,
    pregunta: string,
  ): Promise<RespuestaAsistenteDto> {
    return this.preguntarUC.ejecutar(pacienteId, pregunta);
  }

  async analizarFoto(
    pacienteId: string,
    datos: { archivoId?: string | null; descripcion?: string | null },
  ): Promise<ResultadoAnalisisComidaDto> {
    return this.analizarUC.ejecutar({
      pacienteId,
      archivoId: datos.archivoId,
      descripcion: datos.descripcion ?? undefined,
    });
  }

  async misConsultas(pacienteId: string): Promise<ConsultaIASalidaDto[]> {
    const consultas = await this.listarConsultasUC.ejecutar(pacienteId);
    return consultas.map((c) => {
      const p = c.aPrimitivos();
      return {
        id: p.id,
        pregunta: p.pregunta,
        respuesta: p.respuesta,
        creadoEn: p.creadoEn,
      };
    });
  }

  async insights(): Promise<InsightPacienteDto[]> {
    return this.insightsUC.ejecutar();
  }

  /** Consulta analítica del nutricionista (con herramientas sobre la base). */
  async analizar(pregunta: string): Promise<RespuestaAsistenteDto> {
    return this.analizarConAsistenteUC.ejecutar(pregunta);
  }

  /** Registra la corrección del profesional sobre un insight (👍/👎). */
  async registrarFeedback(datos: FeedbackInsightDto): Promise<void> {
    await this.registrarFeedbackUC.ejecutar({
      pacienteId: datos.pacienteId,
      tipoInsight: datos.tipoInsight,
      util: datos.util,
      detalle: datos.detalle,
      comentario: datos.comentario ?? null,
    });
  }
}
