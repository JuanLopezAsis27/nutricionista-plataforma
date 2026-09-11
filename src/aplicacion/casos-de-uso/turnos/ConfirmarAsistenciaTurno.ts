import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import type { Turno } from "@/dominio/entidades/Turno";
import { ErrorTurnoNoEncontrado } from "@/dominio/errores/ErrorTurnoNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { escaparHtml } from "@/dominio/plantillas/renderizar";
import { formatearFechaCorta } from "../secretaria/variables";

export interface AsistenciaConfirmada {
  fecha: string; // DD/MM/AAAA
  hora: string;
  yaEstabaConfirmado: boolean;
}

/**
 * Caso de uso: el paciente confirma su turno desde el enlace del recordatorio.
 * El turno pasa a CONFIRMADO y el nutricionista recibe un email y un aviso en
 * tiempo real.
 */
export class ConfirmarAsistenciaTurno {
  constructor(
    private readonly turnos: ITurnoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly servicioEmail: IServicioEmail,
    private readonly bus: IBusEventos,
  ) {}

  async ejecutar(turnoId: string): Promise<AsistenciaConfirmada> {
    const turno = await this.turnos.obtenerPorId(turnoId);
    if (!turno) {
      throw new ErrorTurnoNoEncontrado(turnoId);
    }

    const fecha = formatearFechaCorta(turno.fecha);
    // Abrir el enlace de nuevo no vuelve a avisar.
    if (turno.estado === "CONFIRMADO") {
      return { fecha, hora: turno.hora, yaEstabaConfirmado: true };
    }
    if (turno.estado !== "PENDIENTE") {
      throw new ErrorValidacion(
        "Este turno ya no se puede confirmar. Si tenés dudas, comunicate con tu nutricionista.",
      );
    }

    turno.cambiarEstado("CONFIRMADO");
    await this.turnos.actualizar(turno);
    await this.avisarAlProfesional(turno, fecha);
    return { fecha, hora: turno.hora, yaEstabaConfirmado: false };
  }

  private async avisarAlProfesional(turno: Turno, fecha: string) {
    const paciente = await this.pacientes.obtenerPorId(turno.pacienteId);
    const nombre = paciente?.nombreCompleto ?? "Un paciente";
    const mensaje = `${nombre} confirmó su turno del ${fecha} a las ${turno.hora}.`;
    const pie = "El turno ya figura como confirmado en tu agenda.";

    for (const nutri of await this.usuarios.listarPorRol("NUTRICIONISTA")) {
      // La confirmación ya quedó guardada: un aviso que falla no la deshace
      // ni le muestra un error al paciente.
      try {
        await this.bus.publicar({
          tipo: "turno.confirmado",
          usuarioId: nutri.id,
          datos: { turnoId: turno.id, mensaje },
        });
        await this.servicioEmail.enviar({
          para: nutri.email,
          asunto: `${nombre} confirmó su turno del ${fecha}`,
          html: `<p>${escaparHtml(mensaje)}</p><p>${pie}</p>`,
          texto: `${mensaje}\n\n${pie}`,
        });
      } catch (error) {
        console.error(
          `[turnos] falló el aviso de confirmación del turno ${turno.id}:`,
          error,
        );
      }
    }
  }
}
