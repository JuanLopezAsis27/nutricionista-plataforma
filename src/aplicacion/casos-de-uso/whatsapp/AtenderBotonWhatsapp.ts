import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { BotonTocado } from "@/dominio/servicios/botonesWhatsapp";
import type { Paciente } from "@/dominio/entidades/Paciente";
import type { ConfirmarAsistenciaTurno } from "../turnos/ConfirmarAsistenciaTurno";
import type { EmitirNotificacion } from "../notificaciones/EmitirNotificacion";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { formatearFechaCorta } from "../secretaria/variables";

/** Estados de turno sobre los que un botón todavía puede actuar. */
const ESTADOS_ACTIVOS = new Set(["PENDIENTE", "CONFIRMADO"]);

/**
 * Caso de uso: hacer lo que pide el botón de una plantilla que tocó el
 * paciente.
 *
 * - CONFIRMAR_TURNO confirma el turno por el MISMO camino que el enlace del
 *   email (`ConfirmarAsistenciaTurno`): mismo aviso en la campana, mismo
 *   email al profesional. Dos caminos para confirmar terminarían avisando
 *   distinto.
 * - PEDIR_REPROGRAMACION no toca el turno: reprogramar necesita acordar otro
 *   horario, y eso lo hace el profesional. Deja el aviso en la campana.
 * - PEDIR_CANCELACION tampoco lo toca: avisa en la campana y el profesional
 *   lo cancela al leerlo. Una respuesta rápida se toca sin querer y no tiene
 *   segundo paso; la cancelación sin intervención es la del enlace
 *   (`/cancelar-turno`), que sí lo pide.
 *
 * El turno tiene que ser de ESE paciente: el payload lo arma la app, pero
 * igual se verifica, porque es un id que viene de afuera.
 *
 * Devuelve si actuó. Cuando no puede (el turno ya se canceló, o ya pasó), el
 * toque queda como un mensaje más del chat y el aviso de WhatsApp de siempre
 * es el que le cuenta al profesional.
 */
export class AtenderBotonWhatsapp {
  constructor(
    private readonly turnos: ITurnoRepositorio,
    private readonly confirmarAsistencia: ConfirmarAsistenciaTurno,
    private readonly emitirNotificacion: EmitirNotificacion,
  ) {}

  async ejecutar(paciente: Paciente, boton: BotonTocado): Promise<boolean> {
    const turno = await this.turnos.obtenerPorId(boton.turnoId);
    if (
      !turno ||
      turno.pacienteId !== paciente.id ||
      !ESTADOS_ACTIVOS.has(turno.estado)
    ) {
      return false;
    }

    if (boton.accion === "CONFIRMAR_TURNO") {
      try {
        await this.confirmarAsistencia.ejecutar(turno.id);
        return true;
      } catch (error) {
        // "Este turno ya no se puede confirmar": un estado del turno, no una
        // falla. El toque sigue en el chat para que el profesional lo vea.
        if (error instanceof ErrorValidacion) return false;
        throw error;
      }
    }

    const fecha = formatearFechaCorta(turno.fecha);
    if (boton.accion === "PEDIR_CANCELACION") {
      await this.emitirNotificacion.ejecutar({
        tipo: "CANCELACION_PEDIDA",
        titulo: `${paciente.nombreCompleto} pidió cancelar su turno`,
        detalle: `El del ${fecha} a las ${turno.hora}. Sigue en la agenda hasta que lo canceles vos.`,
        pacienteId: paciente.id,
        enlace: `/dashboard/mensajes?paciente=${paciente.id}&canal=whatsapp`,
      });
      return true;
    }

    await this.emitirNotificacion.ejecutar({
      tipo: "REPROGRAMACION_PEDIDA",
      titulo: `${paciente.nombreCompleto} pidió reprogramar su turno`,
      detalle: `El del ${fecha} a las ${turno.hora}. Escribile por WhatsApp para acordar otro horario.`,
      pacienteId: paciente.id,
      enlace: `/dashboard/mensajes?paciente=${paciente.id}&canal=whatsapp`,
    });
    return true;
  }
}
