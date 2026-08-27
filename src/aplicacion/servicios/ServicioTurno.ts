import type { AgendarTurno } from "@/dominio/casos-de-uso/turnos/AgendarTurno";
import type { ObtenerTurnos } from "@/dominio/casos-de-uso/turnos/ObtenerTurnos";
import type { ObtenerTurnosPorPaciente } from "@/dominio/casos-de-uso/turnos/ObtenerTurnosPorPaciente";
import type { ActualizarEstadoTurno } from "@/dominio/casos-de-uso/turnos/ActualizarEstadoTurno";
import type { CancelarTurno } from "@/dominio/casos-de-uso/turnos/CancelarTurno";
import type { ReprogramarTurno } from "@/dominio/casos-de-uso/turnos/ReprogramarTurno";
import type { RegistrarCobroTurno } from "@/dominio/casos-de-uso/turnos/RegistrarCobroTurno";
import type { ObtenerRecordatoriosDeTurnos } from "@/dominio/casos-de-uso/whatsapp/ObtenerRecordatoriosDeTurnos";
import type { RecordatorioWhatsapp } from "@/dominio/entidades/RecordatorioWhatsapp";
import type { ISincronizadorCalendario } from "@/dominio/servicios/ISincronizadorCalendario";
import type { Turno } from "@/dominio/entidades/Turno";
import type {
  AgendarTurnoDto,
  ListarTurnosDto,
  ActualizarEstadoTurnoDto,
  ReprogramarTurnoDto,
  RegistrarCobroTurnoDto,
  TurnoSalidaDto,
} from "../dtos/turno.dto";
import { ServicioWhatsapp } from "./ServicioWhatsapp";

/**
 * Servicio de aplicación de Turnos.
 * Orquesta los casos de uso y devuelve DTOs de salida.
 */
export class ServicioTurno {
  constructor(
    private readonly agendarUC: AgendarTurno,
    private readonly obtenerTodosUC: ObtenerTurnos,
    private readonly obtenerPorPacienteUC: ObtenerTurnosPorPaciente,
    private readonly actualizarEstadoUC: ActualizarEstadoTurno,
    private readonly cancelarUC: CancelarTurno,
    private readonly reprogramarUC: ReprogramarTurno,
    private readonly registrarCobroUC: RegistrarCobroTurno,
    private readonly sincronizador: ISincronizadorCalendario,
    private readonly recordatoriosUC: ObtenerRecordatoriosDeTurnos,
  ) {}

  async agendarTurno(datos: AgendarTurnoDto): Promise<TurnoSalidaDto> {
    const turno = await this.agendarUC.ejecutar(datos);
    await this.sincronizador.alAgendar(ServicioTurno.datosSync(turno));
    return ServicioTurno.aSalida(turno);
  }

  async obtenerTurnos(datos: ListarTurnosDto): Promise<TurnoSalidaDto[]> {
    return this.conRecordatorios(await this.obtenerTodosUC.ejecutar(datos));
  }

  async obtenerTurnosPorPaciente(pacienteId: string): Promise<TurnoSalidaDto[]> {
    return this.conRecordatorios(await this.obtenerPorPacienteUC.ejecutar(pacienteId));
  }

  /**
   * Adjunta a cada turno su último recordatorio por WhatsApp. El read model lo
   * arma el servidor (como ya pasa con los resúmenes de conversación) para que
   * la grilla no tenga que pedir el estado en una segunda consulta.
   */
  private async conRecordatorios(turnos: Turno[]): Promise<TurnoSalidaDto[]> {
    const recordatorios = await this.recordatoriosUC.ejecutar(turnos.map((t) => t.id));
    return turnos.map((turno) => ServicioTurno.aSalida(turno, recordatorios.get(turno.id)));
  }

  async actualizarEstadoTurno(datos: ActualizarEstadoTurnoDto): Promise<TurnoSalidaDto> {
    const turno = await this.actualizarEstadoUC.ejecutar(datos.id, datos.estado);
    return ServicioTurno.aSalida(turno);
  }

  async cancelarTurno(id: string): Promise<TurnoSalidaDto> {
    const turno = await this.cancelarUC.ejecutar(id);
    await this.sincronizador.alCancelar(id);
    return ServicioTurno.aSalida(turno);
  }

  async reprogramarTurno(datos: ReprogramarTurnoDto): Promise<TurnoSalidaDto> {
    const turno = await this.reprogramarUC.ejecutar(datos);
    await this.sincronizador.alReprogramar(ServicioTurno.datosSync(turno));
    return ServicioTurno.aSalida(turno);
  }

  async registrarCobroTurno(datos: RegistrarCobroTurnoDto): Promise<TurnoSalidaDto> {
    const turno = await this.registrarCobroUC.ejecutar(datos.id, datos.precio, datos.pagado);
    return ServicioTurno.aSalida(turno);
  }

  private static aSalida(turno: Turno, recordatorio?: RecordatorioWhatsapp): TurnoSalidaDto {
    return {
      ...turno.aPrimitivos(),
      recordatorioWhatsapp: recordatorio ? ServicioWhatsapp.aSalida(recordatorio) : null,
    };
  }

  /** Datos mínimos del turno para el sincronizador de calendario. */
  private static datosSync(turno: Turno) {
    const d = turno.aPrimitivos();
    return {
      id: d.id,
      pacienteId: d.pacienteId,
      fecha: d.fecha,
      hora: d.hora,
      duracionMinutos: d.duracionMinutos,
    };
  }
}
