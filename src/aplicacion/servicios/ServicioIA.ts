import type { PreguntarAlAsistente } from "@/aplicacion/casos-de-uso/ia/PreguntarAlAsistente";
import type { AnalizarFotoDeComida } from "@/aplicacion/casos-de-uso/ia/AnalizarFotoDeComida";
import type { ListarConsultasIA } from "@/aplicacion/casos-de-uso/ia/ListarConsultasIA";
import type { ObtenerInsightsPredictivos } from "@/aplicacion/casos-de-uso/ia/ObtenerInsightsPredictivos";
import type { AnalizarConAsistente } from "@/aplicacion/casos-de-uso/ia/AnalizarConAsistente";
import type {
  ListarConversacionesIA,
  ObtenerConversacionIA,
  EliminarConversacionIA,
} from "@/aplicacion/casos-de-uso/ia/GestionarConversacionesIA";
import type { RegistrarRetroalimentacionInsight } from "@/aplicacion/casos-de-uso/ia/RegistrarRetroalimentacionInsight";
import type {
  RespuestaAsistenteDto,
  RespuestaAnalisisDto,
  ResumenConversacionIADto,
  ConversacionIASalidaDto,
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
    private readonly listarConversacionesUC: ListarConversacionesIA,
    private readonly obtenerConversacionUC: ObtenerConversacionIA,
    private readonly eliminarConversacionUC: EliminarConversacionIA,
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
  async analizar(datos: {
    pregunta: string;
    conversacionId?: string | null;
  }): Promise<RespuestaAnalisisDto> {
    return this.analizarConAsistenteUC.ejecutar(datos);
  }

  /** Los chats del profesional con el asistente, para la barra lateral. */
  async conversaciones(): Promise<ResumenConversacionIADto[]> {
    return this.listarConversacionesUC.ejecutar();
  }

  /** Un chat guardado, con todos sus turnos. */
  async conversacion(id: string): Promise<ConversacionIASalidaDto> {
    const c = await this.obtenerConversacionUC.ejecutar(id);
    const d = c.aPrimitivos();
    return {
      id: d.id,
      titulo: d.titulo,
      mensajes: d.mensajes.map((m) => ({
        id: m.id,
        rol: m.rol,
        contenido: m.contenido,
        creadoEn: m.creadoEn,
      })),
      actualizadoEn: d.actualizadoEn,
    };
  }

  async eliminarConversacion(id: string): Promise<void> {
    await this.eliminarConversacionUC.ejecutar(id);
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
