import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
import { verificarDentroDeLaAgenda } from "@/dominio/servicios/agendaConsultorio";
import { Turno, type DatosNuevoTurno } from "@/dominio/entidades/Turno";
import type { Establecimiento } from "@/dominio/entidades/Establecimiento";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorTurnoConflicto } from "@/dominio/errores/ErrorTurnoConflicto";
import { ErrorEstablecimientoNoEncontrado } from "@/dominio/errores/ErrorEstablecimientoNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/**
 * Entrada del caso de uso.
 *
 * `establecimientoId` es opcional acá aunque la entidad lo exija: la pantalla
 * puede no haber elegido sede (todavía no hay selector, o el consultorio tiene
 * una sola). Resolverlo es responsabilidad de este caso de uso —"si no me
 * dicen dónde, es la principal"— y no de la entidad, que no puede consultar
 * repositorios, ni de la pantalla, que inventaría cada una su propio default.
 */
export type DatosAgendarTurno = Omit<DatosNuevoTurno, "establecimientoId"> & {
  establecimientoId?: string;
};

/**
 * Caso de uso: agendar un turno nuevo.
 *
 * Responsabilidad única: verificar que el paciente exista, resolver en qué
 * establecimiento se atiende, verificar que el turno caiga dentro de la agenda
 * declarada del consultorio (días y horario de atención), comprobar que no se
 * solape con otro de la misma fecha (regla de no conflicto) y persistirlo con
 * estado PENDIENTE.
 *
 * El solapamiento se decide con la regla de negocio de la entidad
 * (Turno.seSolapaCon), no con lógica en infraestructura: el repositorio solo
 * provee los turnos de la fecha (obtenerEnFecha). **Se comprueba contra TODOS
 * los turnos del día, no solo los de la misma sede**: el profesional no puede
 * estar en dos consultorios a las 10:00.
 */
export class AgendarTurno {
  constructor(
    private readonly turnos: ITurnoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly establecimientos: IEstablecimientoRepositorio,
  ) {}

  async ejecutar(datos: DatosAgendarTurno): Promise<Turno> {
    // 1. El paciente debe existir.
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }

    // 2. Dónde se atiende. El paciente NO decide la sede: puede ir a las dos,
    //    y `establecimientoHabitual` es solo la preferencia que la pantalla
    //    usa para precargar el formulario.
    const establecimiento = await this.resolverEstablecimiento(
      datos.establecimientoId,
    );

    // 3. Construir la entidad (valida hora, duración, etc. y fija PENDIENTE).
    const nuevo = Turno.crear(
      { ...datos, establecimientoId: establecimiento.id },
      crypto.randomUUID(),
    );

    // 4. La agenda DE ESA SEDE: día de atención y horario declarados.
    verificarDentroDeLaAgenda(establecimiento, {
      fecha: nuevo.fecha,
      hora: nuevo.hora,
      duracionMinutos: nuevo.duracionMinutos,
    });

    // 5. Regla de no solapamiento (ignorando los turnos cancelados).
    const delDia = await this.turnos.obtenerEnFecha(nuevo.fecha);
    const hayConflicto = delDia
      .filter((existente) => existente.estado !== "CANCELADO")
      .some((existente) => nuevo.seSolapaCon(existente));

    if (hayConflicto) {
      throw new ErrorTurnoConflicto(
        nuevo.fecha.toISOString().slice(0, 10),
        nuevo.hora,
      );
    }

    // 6. Persistir.
    return this.turnos.crear(nuevo);
  }

  /**
   * La sede elegida, o la principal si no eligieron ninguna.
   *
   * Una sede archivada se rechaza en vez de aceptarse en silencio: agendar en
   * un consultorio que cerró es casi siempre un formulario con un valor viejo,
   * y el turno terminaría en un lugar al que nadie va a ir.
   */
  private async resolverEstablecimiento(
    id: string | undefined,
  ): Promise<Establecimiento> {
    if (id) {
      const elegido = await this.establecimientos.obtenerPorId(id);
      if (!elegido) {
        throw new ErrorEstablecimientoNoEncontrado(id);
      }
      if (elegido.estaArchivado) {
        throw new ErrorValidacion(
          `El establecimiento «${elegido.nombre}» está archivado: no se pueden agendar turnos ahí.`,
        );
      }
      return elegido;
    }

    // Sin elección explícita: la principal. El fallback al primero vigente
    // cubre al consultorio que archivó su principal y todavía no marcó otra.
    const principal = await this.establecimientos.obtenerPrincipal();
    if (principal) return principal;

    const [primero] = await this.establecimientos.listar();
    if (primero) return primero;

    throw new ErrorValidacion(
      "El consultorio no tiene ningún establecimiento activo. Creá uno antes de agendar turnos.",
    );
  }
}
