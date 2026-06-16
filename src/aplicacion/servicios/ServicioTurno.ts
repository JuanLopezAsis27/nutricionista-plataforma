import type { AgendarTurno } from "@/dominio/casos-de-uso/turnos/AgendarTurno";
import type { ObtenerTurnos } from "@/dominio/casos-de-uso/turnos/ObtenerTurnos";
import type { ObtenerTurnosPorPaciente } from "@/dominio/casos-de-uso/turnos/ObtenerTurnosPorPaciente";
import type { ActualizarEstadoTurno } from "@/dominio/casos-de-uso/turnos/ActualizarEstadoTurno";
import type { CancelarTurno } from "@/dominio/casos-de-uso/turnos/CancelarTurno";
import type { ReprogramarTurno } from "@/dominio/casos-de-uso/turnos/ReprogramarTurno";
import type { Turno } from "@/dominio/entidades/Turno";
import type {
  AgendarTurnoDto,
  ListarTurnosDto,
  ActualizarEstadoTurnoDto,
  ReprogramarTurnoDto,
  TurnoSalidaDto,
} from "../dtos/turno.dto";

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
  ) {}

  async agendarTurno(datos: AgendarTurnoDto): Promise<TurnoSalidaDto> {
    const turno = await this.agendarUC.ejecutar(datos);
    return ServicioTurno.aSalida(turno);
  }

  async obtenerTurnos(datos: ListarTurnosDto): Promise<TurnoSalidaDto[]> {
    const turnos = await this.obtenerTodosUC.ejecutar(datos);
    return turnos.map(ServicioTurno.aSalida);
  }

  async obtenerTurnosPorPaciente(pacienteId: string): Promise<TurnoSalidaDto[]> {
    const turnos = await this.obtenerPorPacienteUC.ejecutar(pacienteId);
    return turnos.map(ServicioTurno.aSalida);
  }

  async actualizarEstadoTurno(datos: ActualizarEstadoTurnoDto): Promise<TurnoSalidaDto> {
    const turno = await this.actualizarEstadoUC.ejecutar(datos.id, datos.estado);
    return ServicioTurno.aSalida(turno);
  }

  async cancelarTurno(id: string): Promise<TurnoSalidaDto> {
    const turno = await this.cancelarUC.ejecutar(id);
    return ServicioTurno.aSalida(turno);
  }

  async reprogramarTurno(datos: ReprogramarTurnoDto): Promise<TurnoSalidaDto> {
    const turno = await this.reprogramarUC.ejecutar(datos);
    return ServicioTurno.aSalida(turno);
  }

  private static aSalida(turno: Turno): TurnoSalidaDto {
    return turno.aPrimitivos();
  }
}
