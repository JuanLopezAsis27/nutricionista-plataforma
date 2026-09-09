import type { AgendarTurno } from "@/aplicacion/casos-de-uso/turnos/AgendarTurno";
import type { ObtenerTurnos } from "@/aplicacion/casos-de-uso/turnos/ObtenerTurnos";
import type { ObtenerTurnosPorPaciente } from "@/aplicacion/casos-de-uso/turnos/ObtenerTurnosPorPaciente";
import type { ActualizarEstadoTurno } from "@/aplicacion/casos-de-uso/turnos/ActualizarEstadoTurno";
import type { CancelarTurno } from "@/aplicacion/casos-de-uso/turnos/CancelarTurno";
import type { ReprogramarTurno } from "@/aplicacion/casos-de-uso/turnos/ReprogramarTurno";
import type { RegistrarCobroTurno } from "@/aplicacion/casos-de-uso/turnos/RegistrarCobroTurno";
import type { EliminarTurno } from "@/aplicacion/casos-de-uso/turnos/EliminarTurno";
import type { ISincronizadorCalendario } from "@/dominio/servicios/ISincronizadorCalendario";
import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
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
    private readonly sincronizador: ISincronizadorCalendario,
    private readonly establecimientos: IEstablecimientoRepositorio,
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
   * Un solo turno: la sede se pide por id (no del listado vigente), porque un
   * turno viejo puede ser de una sede archivada y esa sigue siendo la
   * dirección correcta para ese turno (ver docs/ESTABLECIMIENTOS.md).
   */
  private async aSalidaUno(turno: Turno): Promise<TurnoSalidaDto> {
    const d = turno.aPrimitivos();
    const sede = await this.establecimientos.obtenerPorId(d.establecimientoId);
    return ServicioTurno.conSede(turno, sede);
  }

  /**
   * Varios turnos: una sola consulta que trae TODAS las sedes (vigentes y
   * archivadas) a un Map antes del bucle, en vez de pedir la sede por turno —
   * mismo criterio que usan los recordatorios masivos.
   */
  private async aSalidaLote(turnos: Turno[]): Promise<TurnoSalidaDto[]> {
    if (turnos.length === 0) return [];
    const sedes = new Map(
      (await this.establecimientos.listar({ incluirArchivados: true })).map(
        (e) => [e.id, e],
      ),
    );
    return turnos.map((turno) =>
      ServicioTurno.conSede(
        turno,
        sedes.get(turno.aPrimitivos().establecimientoId) ?? null,
      ),
    );
  }

  /**
   * Nunca queda el placeholder crudo: sin sede resuelta, nombre y dirección
   * van vacíos en vez de mostrar el id.
   */
  private static conSede(
    turno: Turno,
    sede: Establecimiento | null,
  ): TurnoSalidaDto {
    return {
      ...turno.aPrimitivos(),
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
