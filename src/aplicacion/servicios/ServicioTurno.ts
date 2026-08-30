import type { AgendarTurno } from "@/aplicacion/casos-de-uso/turnos/AgendarTurno";
import type { ObtenerTurnos } from "@/aplicacion/casos-de-uso/turnos/ObtenerTurnos";
import type { ObtenerTurnosPorPaciente } from "@/aplicacion/casos-de-uso/turnos/ObtenerTurnosPorPaciente";
import type { ActualizarEstadoTurno } from "@/aplicacion/casos-de-uso/turnos/ActualizarEstadoTurno";
import type { CancelarTurno } from "@/aplicacion/casos-de-uso/turnos/CancelarTurno";
import type { ReprogramarTurno } from "@/aplicacion/casos-de-uso/turnos/ReprogramarTurno";
import type { RegistrarCobroTurno } from "@/aplicacion/casos-de-uso/turnos/RegistrarCobroTurno";
import type { EliminarTurno } from "@/aplicacion/casos-de-uso/turnos/EliminarTurno";
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

/**
 * Servicio de aplicación de Turnos.
 * Orquesta los casos de uso y devuelve DTOs de salida.
 *
 * El estado del recordatorio por WhatsApp ya NO viaja acá. Existía para pintar
 * el botón de la grilla, que se fue a Recordatorios: seguir adjuntándolo
 * costaba una consulta por cada listado de turnos para un dato que nadie lee.
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
    private readonly eliminarUC: EliminarTurno,
    private readonly sincronizador: ISincronizadorCalendario,
  ) {}

  async agendarTurno(datos: AgendarTurnoDto): Promise<TurnoSalidaDto> {
    const turno = await this.agendarUC.ejecutar(datos);
    await this.sincronizador.alAgendar(ServicioTurno.datosSync(turno));
    return ServicioTurno.aSalida(turno);
  }

  async obtenerTurnos(datos: ListarTurnosDto): Promise<TurnoSalidaDto[]> {
    return (await this.obtenerTodosUC.ejecutar(datos)).map(
      ServicioTurno.aSalida,
    );
  }

  async obtenerTurnosPorPaciente(
    pacienteId: string,
  ): Promise<TurnoSalidaDto[]> {
    return (await this.obtenerPorPacienteUC.ejecutar(pacienteId)).map(
      ServicioTurno.aSalida,
    );
  }

  async actualizarEstadoTurno(
    datos: ActualizarEstadoTurnoDto,
  ): Promise<TurnoSalidaDto> {
    const turno = await this.actualizarEstadoUC.ejecutar(
      datos.id,
      datos.estado,
    );
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

  /**
   * Borra un turno cancelado de la agenda. El sincronizador de calendario ya
   * lo maneja el caso de uso: acá no se repite, para que borrar y cancelar no
   * puedan divergir en qué le pasa al evento externo.
   */
  async eliminarTurno(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  async registrarCobroTurno(
    datos: RegistrarCobroTurnoDto,
  ): Promise<TurnoSalidaDto> {
    const turno = await this.registrarCobroUC.ejecutar(
      datos.id,
      datos.precio,
      datos.pagado,
    );
    return ServicioTurno.aSalida(turno);
  }

  private static aSalida(turno: Turno): TurnoSalidaDto {
    return turno.aPrimitivos();
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
