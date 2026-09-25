import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  crearRouter,
  nutricionistaProcedimiento,
  protegidoProcedimiento,
  publicoProcedimiento,
} from "../trpc";
import { pacienteConsultable } from "@/dominio/servicios/politicaAcceso";
import { ejecutarEnNutricionista } from "@/infraestructura/multitenancy/contextoTenant";
import { limitadorConfirmacionTurno } from "@/infraestructura/seguridad/LimitadorTasa";
import { enlacesTurno } from "@/infraestructura/contenedor/contenedor";
import {
  agendarTurnoDto,
  listarTurnosDto,
  actualizarEstadoTurnoDto,
  cancelarTurnoDto,
  reprogramarTurnoDto,
  registrarCobroTurnoDto,
  confirmarAsistenciaDto,
  cancelarPorPacienteDto,
} from "@/aplicacion/dtos/turno.dto";
import type { AccionEnlaceTurno } from "@/dominio/servicios/IEnlacesTurno";

/**
 * Consultorio y turno de un enlace del recordatorio, con el límite por IP.
 * Lo comparten confirmar y cancelar: los dos son públicos, y la firma de cada
 * acción es distinta, así que un token de una no pasa por la otra.
 */
function destinoDelEnlace(
  accion: AccionEnlaceTurno,
  token: string,
  ip: string,
): { nutricionistaId: string; turnoId: string } {
  const porIp = limitadorConfirmacionTurno.intentar(
    `${accion === "CONFIRMAR" ? "confirmar" : "cancelar"}-turno:${ip}`,
  );
  if (!porIp.permitido) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Demasiados intentos. Probá de nuevo en unos minutos.",
    });
  }
  const destino = enlacesTurno().verificar(accion, token, new Date());
  if (!destino) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "El enlace no es válido o ya venció.",
    });
  }
  return destino;
}

/**
 * Router de Turnos (presentación → aplicación).
 *
 * La gestión es del NUTRICIONISTA; el paciente solo puede ver sus propios
 * turnos (obtenerPorPaciente, con procedimiento protegido) y confirmar o
 * cancelar desde el enlace del recordatorio (confirmarAsistencia y
 * cancelarPorPaciente, públicos).
 */
export const routerTurnos = crearRouter({
  obtenerTodos: nutricionistaProcedimiento
    .input(listarTurnosDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.turno.obtenerTurnos(input);
    }),

  obtenerPorPaciente: protegidoProcedimiento
    .input(z.object({ pacienteId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      // El nutricionista consulta cualquier paciente; el paciente, solo el suyo.
      const objetivo = pacienteConsultable(
        ctx.usuario,
        input.pacienteId,
        "turnos",
      );
      return await ctx.servicios.turno.obtenerTurnosPorPaciente(objetivo);
    }),

  agendar: nutricionistaProcedimiento
    .input(agendarTurnoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.turno.agendarTurno(input);
    }),

  actualizarEstado: nutricionistaProcedimiento
    .input(actualizarEstadoTurnoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.turno.actualizarEstadoTurno(input);
    }),

  cancelar: nutricionistaProcedimiento
    .input(cancelarTurnoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.turno.cancelarTurno(input.id);
    }),

  /**
   * Borra un turno cancelado. Distinto de `cancelar`, que es baja lógica: esto
   * lo saca de la agenda para siempre y solo aplica a cancelados sin cobro.
   */
  eliminar: nutricionistaProcedimiento
    .input(cancelarTurnoDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.turno.eliminarTurno(input.id);
      return { eliminado: true };
    }),

  reprogramar: nutricionistaProcedimiento
    .input(reprogramarTurnoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.turno.reprogramarTurno(input);
    }),

  registrarCobro: nutricionistaProcedimiento
    .input(registrarCobroTurnoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.turno.registrarCobroTurno(input);
    }),

  /**
   * Sin sesión: el consultorio y el turno salen del enlace firmado, y con eso
   * se fija el inquilino antes de tocar la base.
   */
  confirmarAsistencia: publicoProcedimiento
    .input(confirmarAsistenciaDto)
    .mutation(async ({ ctx, input }) => {
      const destino = destinoDelEnlace("CONFIRMAR", input.token, ctx.ip);
      return await ejecutarEnNutricionista(destino.nutricionistaId, () =>
        ctx.servicios.turno.confirmarAsistencia(destino.turnoId),
      );
    }),

  /** Igual que confirmar: sin sesión, el inquilino sale del enlace firmado. */
  cancelarPorPaciente: publicoProcedimiento
    .input(cancelarPorPacienteDto)
    .mutation(async ({ ctx, input }) => {
      const destino = destinoDelEnlace("CANCELAR", input.token, ctx.ip);
      return await ejecutarEnNutricionista(destino.nutricionistaId, () =>
        ctx.servicios.turno.cancelarPorPaciente(destino.turnoId),
      );
    }),
});
