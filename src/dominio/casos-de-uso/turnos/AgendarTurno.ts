import type { ITurnoRepositorio } from "../../repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "../../repositorios/IConfiguracionRepositorio";
import { verificarDentroDeLaAgenda } from "../../servicios/agendaConsultorio";
import { Turno, type DatosNuevoTurno } from "../../entidades/Turno";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import { ErrorTurnoConflicto } from "../../errores/ErrorTurnoConflicto";

/**
 * Caso de uso: agendar un turno nuevo.
 *
 * Responsabilidad única: verificar que el paciente exista, que el turno caiga
 * dentro de la agenda declarada del consultorio (días y horario de atención),
 * comprobar que no se solape con otro de la misma fecha (regla de no conflicto)
 * y persistirlo con estado PENDIENTE.
 *
 * El solapamiento se decide con la regla de negocio de la entidad
 * (Turno.seSolapaCon), no con lógica en infraestructura: el repositorio solo
 * provee los turnos de la fecha (obtenerEnFecha).
 */
export class AgendarTurno {
  constructor(
    private readonly turnos: ITurnoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly configuracion: IConfiguracionRepositorio,
  ) {}

  async ejecutar(datos: DatosNuevoTurno): Promise<Turno> {
    // 1. El paciente debe existir.
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }

    // 2. Construir la entidad (valida hora, duración, etc. y fija PENDIENTE).
    const nuevo = Turno.crear(datos, crypto.randomUUID());

    // 3. La agenda del consultorio: día de atención y horario declarados.
    await verificarDentroDeLaAgenda(this.configuracion, {
      fecha: nuevo.fecha,
      hora: nuevo.hora,
      duracionMinutos: nuevo.duracionMinutos,
    });

    // 4. Regla de no solapamiento (ignorando los turnos cancelados).
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

    // 5. Persistir.
    return this.turnos.crear(nuevo);
  }
}
