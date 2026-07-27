import type { PreguntarAlAsistente } from "@/dominio/casos-de-uso/ia/PreguntarAlAsistente";
import type { AnalizarFotoDeComida } from "@/dominio/casos-de-uso/ia/AnalizarFotoDeComida";
import type { ListarConsultasIA } from "@/dominio/casos-de-uso/ia/ListarConsultasIA";
import type { ObtenerInsightsPredictivos } from "@/dominio/casos-de-uso/ia/ObtenerInsightsPredictivos";
import type {
  RespuestaAsistenteDto,
  ConsultaIASalidaDto,
  ResultadoAnalisisComidaDto,
  InsightPacienteDto,
} from "../dtos/ia.dto";

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
  ) {}

  async preguntar(pacienteId: string, pregunta: string): Promise<RespuestaAsistenteDto> {
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
      return { id: p.id, pregunta: p.pregunta, respuesta: p.respuesta, creadoEn: p.creadoEn };
    });
  }

  async insights(): Promise<InsightPacienteDto[]> {
    return this.insightsUC.ejecutar();
  }
}
