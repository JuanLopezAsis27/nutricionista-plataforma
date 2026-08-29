import type { IRecordatorioWhatsappRepositorio } from "../../repositorios/IRecordatorioWhatsappRepositorio";
import type { IMensajeWhatsappRepositorio } from "../../repositorios/IMensajeWhatsappRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { ITurnoRepositorio } from "../../repositorios/ITurnoRepositorio";
import type { IProveedorWhatsapp } from "../../servicios/IProveedorWhatsapp";
import type { IRelojFecha } from "../../servicios/IRelojFecha";
import type {
  EstadoRecordatorioWhatsapp,
  RecordatorioWhatsapp,
} from "../../entidades/RecordatorioWhatsapp";
import type { MensajeWhatsapp } from "../../entidades/MensajeWhatsapp";

const DIA_MS = 24 * 60 * 60 * 1000;
const VENTANA_MS = 24 * 60 * 60 * 1000;
/** Historial que mira la bandeja: un mes cubre cualquier programación razonable. */
const DIAS_HISTORIAL = 30;

/** Una fila de la bandeja de seguimiento: un paciente al que se le avisó. */
export interface SeguimientoRecordatorio {
  pacienteId: string;
  nombrePaciente: string;
  /** Último recordatorio que se le mandó. */
  recordatorioId: string;
  estado: EstadoRecordatorioWhatsapp;
  enviadoEn: Date;
  /** Escalón de la programación, o null si fue manual. */
  diasAntes: number | null;
  /** Turno al que corresponde ese aviso, si sigue existiendo. */
  turnoId: string;
  fechaTurno: Date | null;
  horaTurno: string | null;
  /** Último mensaje del chat, sea de quien sea. */
  ultimoMensaje: string | null;
  ultimoMensajeEn: Date | null;
  /** El paciente contestó DESPUÉS de que saliera el recordatorio. */
  respondio: boolean;
  /** Su respuesta se leyó como una confirmación de asistencia. */
  confirmo: boolean;
  /** Se le puede escribir texto libre (ventana de 24 h de Meta abierta). */
  ventanaAbierta: boolean;
}

/**
 * Caso de uso: la bandeja de seguimiento de los recordatorios enviados.
 *
 * Responde la pregunta que el log por sí solo no responde: no "¿a quién le
 * mandé?" sino "¿quién me contestó?". Por eso cada fila cruza el recordatorio
 * con el chat de WhatsApp del paciente y con el turno al que corresponde.
 *
 * `respondio` se calcula comparando la fecha del último mensaje entrante
 * contra la del recordatorio, y no leyendo el estado: un mensaje que entró
 * ANTES del aviso no es una respuesta a ese aviso, y contarlo como tal haría
 * que el profesional diera por confirmado un turno que nadie confirmó.
 *
 * Se agrupa por paciente y no por recordatorio porque el chat es uno solo: dos
 * avisos del mismo turno se leen en la misma conversación, y una bandeja con
 * la misma conversación repetida no ayuda a decidir nada.
 */
export class ListarSeguimientoRecordatorios {
  constructor(
    private readonly recordatorios: IRecordatorioWhatsappRepositorio,
    private readonly mensajes: IMensajeWhatsappRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly turnos: ITurnoRepositorio,
    private readonly proveedor: IProveedorWhatsapp,
    private readonly reloj: IRelojFecha,
  ) {}

  async ejecutar(limite = 50): Promise<SeguimientoRecordatorio[]> {
    const desde = new Date(
      this.reloj.ahora().getTime() - DIAS_HISTORIAL * DIA_MS,
    );
    const enviados = await this.recordatorios.listar({
      desde,
      limite: limite * 3,
    });
    if (enviados.length === 0) return [];

    // Uno por paciente: `listar` viene del más nuevo al más viejo, así que el
    // primero de cada paciente es su último aviso.
    const ultimoPorPaciente = new Map<string, RecordatorioWhatsapp>();
    for (const recordatorio of enviados) {
      if (!recordatorio.salio) continue;
      if (!ultimoPorPaciente.has(recordatorio.pacienteId)) {
        ultimoPorPaciente.set(recordatorio.pacienteId, recordatorio);
      }
    }
    const seleccion = [...ultimoPorPaciente.values()].slice(0, limite);
    if (seleccion.length === 0) return [];

    const pacienteIds = seleccion.map((r) => r.pacienteId);
    // Con la API sin conectar no hay chat que mostrar, pero el seguimiento del
    // envío sigue teniendo sentido: se piden los mensajes igual y vienen vacíos.
    const conectado = (await this.proveedor.modoActual()) === "API";
    const [ultimos, ultimosEntrantes] = conectado
      ? await Promise.all([
          this.mensajes.ultimosPorPacientes(pacienteIds),
          this.mensajes.ultimosEntrantesPorPacientes(pacienteIds),
        ])
      : [new Map<string, MensajeWhatsapp>(), new Map<string, MensajeWhatsapp>()];

    const ahora = this.reloj.ahora().getTime();
    const filas: SeguimientoRecordatorio[] = [];

    for (const recordatorio of seleccion) {
      const datos = recordatorio.aPrimitivos();
      const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
      if (!paciente) continue;

      const turno = await this.turnos.obtenerPorId(datos.turnoId);
      const ultimo = ultimos.get(datos.pacienteId) ?? null;
      const entrante = ultimosEntrantes.get(datos.pacienteId) ?? null;

      filas.push({
        pacienteId: paciente.id,
        nombrePaciente: paciente.nombreCompleto,
        recordatorioId: datos.id,
        estado: datos.estado,
        enviadoEn: datos.creadoEn,
        diasAntes: datos.diasAntes,
        turnoId: datos.turnoId,
        fechaTurno: turno?.fecha ?? null,
        horaTurno: turno?.hora ?? null,
        ultimoMensaje: ultimo?.cuerpo ?? null,
        ultimoMensajeEn: ultimo?.creadoEn ?? null,
        // Solo cuenta lo que entró DESPUÉS del aviso.
        respondio:
          datos.respondidoEn != null ||
          (entrante != null &&
            entrante.creadoEn.getTime() >= datos.creadoEn.getTime()),
        confirmo: datos.estado === "CONFIRMADO",
        ventanaAbierta:
          entrante != null && ahora - entrante.creadoEn.getTime() < VENTANA_MS,
      });
    }

    return filas;
  }
}
