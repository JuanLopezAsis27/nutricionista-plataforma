import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { EmitirNotificacion } from "../notificaciones/EmitirNotificacion";
import type { Turno } from "@/dominio/entidades/Turno";
import { ErrorTurnoNoEncontrado } from "@/dominio/errores/ErrorTurnoNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { escaparHtml } from "@/dominio/plantillas/renderizar";
import { formatearFechaCorta } from "../secretaria/variables";

export interface TurnoCanceladoPorPaciente {
  fecha: string; // DD/MM/AAAA
  hora: string;
  /** Cuándo quedó cancelado. null en uno cancelado antes de la migración 76. */
  canceladoEn: Date | null;
  yaEstabaCancelado: boolean;
}

/**
 * Caso de uso: el paciente cancela su turno desde el enlace del recordatorio
 * (email o botón de WhatsApp). Es la contracara de `ConfirmarAsistenciaTurno`
 * y avisa igual: campana, tiempo real y email al profesional.
 *
 * Queda registrado CUÁNDO y que fue el PACIENTE (`Turno.cancelarPorElPaciente`):
 * es lo que el profesional ve en la agenda.
 *
 * Una vez cancelado, los recordatorios que falten no salen: los dos medios
 * leen el estado del turno en cada barrido y saltean los cancelados.
 *
 * El evento del calendario externo lo borra el servicio, igual que en la
 * cancelación desde la agenda: un turno cancelado no puede seguir sonando en
 * el teléfono del paciente.
 */
export class CancelarTurnoPorPaciente {
  constructor(
    private readonly turnos: ITurnoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly servicioEmail: IServicioEmail,
    private readonly bus: IBusEventos,
    private readonly emitirNotificacion: EmitirNotificacion,
    private readonly reloj: IRelojFecha,
  ) {}

  async ejecutar(turnoId: string): Promise<TurnoCanceladoPorPaciente> {
    const turno = await this.turnos.obtenerPorId(turnoId);
    if (!turno) {
      throw new ErrorTurnoNoEncontrado(turnoId);
    }

    const fecha = formatearFechaCorta(turno.fecha);
    // Abrir el enlace de nuevo no vuelve a avisar.
    if (turno.estado === "CANCELADO") {
      return {
        fecha,
        hora: turno.hora,
        canceladoEn: turno.canceladoEn,
        yaEstabaCancelado: true,
      };
    }
    if (!turno.puedeCancelarse()) {
      throw new ErrorValidacion(
        "Este turno ya no se puede cancelar. Si tenés dudas, comunicate con tu nutricionista.",
      );
    }

    turno.cancelarPorElPaciente(this.reloj.ahora());
    await this.turnos.actualizar(turno);
    await this.avisarAlProfesional(turno, fecha);
    return {
      fecha,
      hora: turno.hora,
      canceladoEn: turno.canceladoEn,
      yaEstabaCancelado: false,
    };
  }

  private async avisarAlProfesional(turno: Turno, fecha: string) {
    const paciente = await this.pacientes.obtenerPorId(turno.pacienteId);
    const nombre = paciente?.nombreCompleto ?? "Un paciente";
    const mensaje = `${nombre} canceló su turno del ${fecha} a las ${turno.hora}.`;
    const pie = "El horario quedó libre en tu agenda.";

    // El aviso que queda, como el de la confirmación: el email y el bus son
    // efímeros, y un turno que se libera es algo que el profesional tiene que
    // poder ver a la mañana siguiente.
    await this.emitirNotificacion.ejecutar({
      tipo: "TURNO_CANCELADO",
      titulo: `${nombre} canceló su turno`,
      detalle: `${fecha} a las ${turno.hora}. ${pie}`,
      pacienteId: turno.pacienteId,
      enlace: "/dashboard/turnos",
    });

    for (const nutri of await this.usuarios.listarPorRol("NUTRICIONISTA")) {
      // La cancelación ya quedó guardada: un aviso que falla no la deshace ni
      // le muestra un error al paciente.
      try {
        await this.bus.publicar({
          tipo: "turno.cancelado",
          usuarioId: nutri.id,
          datos: { turnoId: turno.id, mensaje },
        });
        // La cuenta de un profesional siempre tiene email (CHECK de la
        // migración 80); el tipo lo admite nulo por la de los pacientes.
        if (!nutri.email) continue;
        await this.servicioEmail.enviar({
          para: nutri.email,
          asunto: `${nombre} canceló su turno del ${fecha}`,
          html: `<p>${escaparHtml(mensaje)}</p><p>${pie}</p>`,
          texto: `${mensaje}\n\n${pie}`,
        });
      } catch (error) {
        console.error(
          `[turnos] falló el aviso de cancelación del turno ${turno.id}:`,
          error,
        );
      }
    }
  }
}
