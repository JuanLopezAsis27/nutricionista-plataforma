import type { AgendarTurno } from "@/aplicacion/casos-de-uso/turnos/AgendarTurno";
import type { ObtenerTurnos } from "@/aplicacion/casos-de-uso/turnos/ObtenerTurnos";
import type { ObtenerTurnosPorPaciente } from "@/aplicacion/casos-de-uso/turnos/ObtenerTurnosPorPaciente";
import type { ActualizarEstadoTurno } from "@/aplicacion/casos-de-uso/turnos/ActualizarEstadoTurno";
import type { CancelarTurno } from "@/aplicacion/casos-de-uso/turnos/CancelarTurno";
import type { ReprogramarTurno } from "@/aplicacion/casos-de-uso/turnos/ReprogramarTurno";
import type { RegistrarCobroTurno } from "@/aplicacion/casos-de-uso/turnos/RegistrarCobroTurno";
import type { EliminarTurno } from "@/aplicacion/casos-de-uso/turnos/EliminarTurno";
import type {
  ConfirmarAsistenciaTurno,
  AsistenciaConfirmada,
} from "@/aplicacion/casos-de-uso/turnos/ConfirmarAsistenciaTurno";
import type {
  CancelarTurnoPorPaciente,
  TurnoCanceladoPorPaciente,
} from "@/aplicacion/casos-de-uso/turnos/CancelarTurnoPorPaciente";
import type { ISincronizadorCalendario } from "@/dominio/servicios/ISincronizadorCalendario";
import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { Turno } from "@/dominio/entidades/Turno";
import type { Establecimiento } from "@/dominio/entidades/Establecimiento";
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
    private readonly confirmarAsistenciaUC: ConfirmarAsistenciaTurno,
    private readonly sincronizador: ISincronizadorCalendario,
    private readonly establecimientos: IEstablecimientoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly cancelarPorPacienteUC: CancelarTurnoPorPaciente,
  ) {}

  async agendarTurno(datos: AgendarTurnoDto): Promise<TurnoSalidaDto> {
    const turno = await this.agendarUC.ejecutar(datos);
    await this.sincronizador.alAgendar(ServicioTurno.datosSync(turno));
    return this.aSalidaUno(turno);
  }

  async obtenerTurnos(datos: ListarTurnosDto): Promise<TurnoSalidaDto[]> {
    return this.aSalidaLote(await this.obtenerTodosUC.ejecutar(datos));
  }

  async obtenerTurnosPorPaciente(
    pacienteId: string,
  ): Promise<TurnoSalidaDto[]> {
    return this.aSalidaLote(
      await this.obtenerPorPacienteUC.ejecutar(pacienteId),
    );
  }

  async actualizarEstadoTurno(
    datos: ActualizarEstadoTurnoDto,
  ): Promise<TurnoSalidaDto> {
    const turno = await this.actualizarEstadoUC.ejecutar(
      datos.id,
      datos.estado,
    );
    return this.aSalidaUno(turno);
  }

  async cancelarTurno(id: string): Promise<TurnoSalidaDto> {
    const turno = await this.cancelarUC.ejecutar(id);
    await this.sincronizador.alCancelar(id);
    return this.aSalidaUno(turno);
  }

  async reprogramarTurno(datos: ReprogramarTurnoDto): Promise<TurnoSalidaDto> {
    const turno = await this.reprogramarUC.ejecutar(datos);
    await this.sincronizador.alReprogramar(ServicioTurno.datosSync(turno));
    return this.aSalidaUno(turno);
  }

  /**
   * Borra un turno cancelado de la agenda. El sincronizador de calendario ya
   * lo maneja el caso de uso: acá no se repite, para que borrar y cancelar no
   * puedan divergir en qué le pasa al evento externo.
   */
  async eliminarTurno(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  /** El paciente confirma desde el enlace del recordatorio por email. */
  async confirmarAsistencia(turnoId: string): Promise<AsistenciaConfirmada> {
    return this.confirmarAsistenciaUC.ejecutar(turnoId);
  }

  /**
   * El paciente cancela desde el enlace del recordatorio. El evento del
   * calendario se borra acá, igual que en `cancelarTurno`: los dos caminos de
   * cancelar tienen que dejar el calendario del paciente igual. Solo cuando
   * el turno se canceló AHORA: reabrir el enlace no vuelve a tocar Google.
   */
  async cancelarPorPaciente(
    turnoId: string,
  ): Promise<TurnoCanceladoPorPaciente> {
    const resultado = await this.cancelarPorPacienteUC.ejecutar(turnoId);
    if (!resultado.yaEstabaCancelado) {
      await this.sincronizador.alCancelar(turnoId);
    }
    return resultado;
  }

  async registrarCobroTurno(
    datos: RegistrarCobroTurnoDto,
  ): Promise<TurnoSalidaDto> {
    const turno = await this.registrarCobroUC.ejecutar(
      datos.id,
      datos.precio,
      datos.pagado,
    );
    return this.aSalidaUno(turno);
  }

  /**
   * Un solo turno: la sede y el paciente se piden por id (no del listado
   * vigente), porque un turno viejo puede ser de una sede o de un paciente
   * archivados, y ese sigue siendo el dato correcto para ese turno (ver
   * docs/ESTABLECIMIENTOS.md).
   */
  private async aSalidaUno(turno: Turno): Promise<TurnoSalidaDto> {
    const d = turno.aPrimitivos();
    const [sede, paciente] = await Promise.all([
      this.establecimientos.obtenerPorId(d.establecimientoId),
      this.pacientes.obtenerPorId(d.pacienteId),
    ]);
    return ServicioTurno.aSalida(turno, sede, paciente?.nombreCompleto ?? "");
  }

  /**
   * Varios turnos: una consulta para las sedes y una para los pacientes, a Maps
   * antes del bucle, en vez de pedirlos turno por turno —mismo criterio que
   * usan los recordatorios masivos—.
   *
   * Las sedes se traen TODAS (son pocas); los pacientes, solo los de estos
   * turnos: el consultorio puede tener miles, y traerlos enteros para pintar
   * una semana sería justo el error que tenían las pantallas, del otro lado
   * (ellas se quedaban con los primeros 100 y los demás salían "Paciente").
   */
  private async aSalidaLote(turnos: Turno[]): Promise<TurnoSalidaDto[]> {
    if (turnos.length === 0) return [];
    const pacienteIds = [
      ...new Set(turnos.map((turno) => turno.aPrimitivos().pacienteId)),
    ];
    const [todasLasSedes, pacientes] = await Promise.all([
      this.establecimientos.listar({ incluirArchivados: true }),
      this.pacientes.obtenerPorIds(pacienteIds),
    ]);
    const sedes = new Map(todasLasSedes.map((e) => [e.id, e]));
    const nombres = new Map(pacientes.map((p) => [p.id, p.nombreCompleto]));
    return turnos.map((turno) => {
      const d = turno.aPrimitivos();
      return ServicioTurno.aSalida(
        turno,
        sedes.get(d.establecimientoId) ?? null,
        nombres.get(d.pacienteId) ?? "",
      );
    });
  }

  /**
   * Nunca queda el placeholder crudo: sin sede o paciente resueltos, los
   * nombres van vacíos en vez de mostrar el id.
   */
  private static aSalida(
    turno: Turno,
    sede: Establecimiento | null,
    pacienteNombre: string,
  ): TurnoSalidaDto {
    return {
      ...turno.aPrimitivos(),
      pacienteNombre,
      establecimientoNombre: sede?.nombre ?? "",
      establecimientoDireccion: sede?.direccion ?? null,
    };
  }

  /** Datos mínimos del turno para el sincronizador de calendario. */
  private static datosSync(turno: Turno) {
    const d = turno.aPrimitivos();
    return {
      id: d.id,
      pacienteId: d.pacienteId,
      establecimientoId: d.establecimientoId,
      fecha: d.fecha,
      hora: d.hora,
      duracionMinutos: d.duracionMinutos,
    };
  }
}
