import { TRPCError } from "@trpc/server";
import {
  crearRouter,
  nutricionistaProcedimiento,
  protegidoProcedimiento,
} from "../trpc";
import { pacienteDeSesion } from "@/dominio/servicios/politicaAcceso";
import {
  limitadorIaPaciente,
  limitadorIaInquilino,
} from "@/infraestructura/seguridad/LimitadorTasa";
import {
  preguntarDto,
  analizarDto,
  analizarComidaDto,
  feedbackInsightDto,
  idConversacionIADto,
} from "@/aplicacion/dtos/ia.dto";

/**
 * Cuota de uso de la IA.
 *
 * Cada llamada al modelo se factura contra la `ANTHROPIC_API_KEY` del
 * profesional, así que un paciente en bucle no le degrada el servicio: le
 * genera una factura. Es el único lugar de la app donde una acción de un
 * usuario cuesta dinero por vez, y por eso es el único que necesita cuota.
 *
 * Dos techos, porque un solo techo no alcanza: el de paciente frena a una
 * cuenta abusando, y el de consultorio frena el abuso repartido entre varias
 * cuentas del mismo inquilino.
 */
function verificarCuotaIA(
  pacienteId: string,
  nutricionistaId: string | null,
): void {
  const porPaciente = limitadorIaPaciente.intentar(pacienteId);
  if (!porPaciente.permitido) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message:
        "Llegaste al límite de consultas al asistente por ahora. Probá de nuevo más tarde.",
    });
  }

  const porInquilino = limitadorIaInquilino.intentar(
    `inquilino:${nutricionistaId ?? "sin-inquilino"}`,
  );
  if (!porInquilino.permitido) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "El asistente está con mucha demanda. Probá de nuevo más tarde.",
    });
  }
}

/**
 * Router de IA (andamiaje). Portal del paciente: asistente + análisis de foto
 * (pacienteId de la sesión). Nutricionista: insights predictivos.
 */
export const routerIA = crearRouter({
  // --- Portal del paciente -------------------------------------------------
  // Sin `conversacionId` abre un chat nuevo; con él continúa el existente y el
  // modelo recibe los turnos anteriores como contexto.
  preguntar: protegidoProcedimiento
    .input(preguntarDto)
    .mutation(async ({ ctx, input }) => {
      const pacienteId = pacienteDeSesion(ctx.usuario);
      verificarCuotaIA(pacienteId, ctx.usuario.nutricionistaId);
      return await ctx.servicios.ia.preguntar(pacienteId, input);
    }),

  analizarFoto: protegidoProcedimiento
    .input(analizarComidaDto)
    .mutation(async ({ ctx, input }) => {
      const pacienteId = pacienteDeSesion(ctx.usuario);
      verificarCuotaIA(pacienteId, ctx.usuario.nutricionistaId);
      return await ctx.servicios.ia.analizarFoto(pacienteId, {
        archivoId: input.archivoId,
        descripcion: input.descripcion,
      });
    }),

  /** Los chats guardados del paciente (pacienteId de la sesión). */
  misConversaciones: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.ia.misConversaciones(
      pacienteDeSesion(ctx.usuario),
    );
  }),

  miConversacion: protegidoProcedimiento
    .input(idConversacionIADto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.ia.miConversacion(
        input.id,
        pacienteDeSesion(ctx.usuario),
      );
    }),

  eliminarMiConversacion: protegidoProcedimiento
    .input(idConversacionIADto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.ia.eliminarMiConversacion(
        input.id,
        pacienteDeSesion(ctx.usuario),
      );
      return { eliminado: true };
    }),

  // Si la IA está activa (clave/servicio configurados) para ocultar los banners
  // de "demostración". Cualquier usuario autenticado (el paciente usa la del nutri).
  estado: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.ia.estado();
  }),

  // --- Nutricionista -------------------------------------------------------
  insights: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.ia.insights();
  }),

  // Asistente analítico del nutri: chat con herramientas sobre la base.
  // Sin `conversacionId` abre un chat nuevo; con él continúa el existente y el
  // modelo recibe los turnos anteriores como contexto.
  analizar: nutricionistaProcedimiento
    .input(analizarDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.ia.analizar(input);
    }),

  /** Los chats guardados del profesional con el asistente. */
  conversaciones: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.ia.conversaciones();
  }),

  conversacion: nutricionistaProcedimiento
    .input(idConversacionIADto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.ia.conversacion(input.id);
    }),

  eliminarConversacion: nutricionistaProcedimiento
    .input(idConversacionIADto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.ia.eliminarConversacion(input.id);
      return { eliminado: true };
    }),

  // Loop de feedback: el nutri corrige un insight (👍/👎) → etiqueta para el ML.
  feedbackInsight: nutricionistaProcedimiento
    .input(feedbackInsightDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.ia.registrarFeedback(input);
      return { ok: true };
    }),
});
