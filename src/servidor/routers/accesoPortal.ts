import { TRPCError } from "@trpc/server";
import {
  crearRouter,
  nutricionistaProcedimiento,
  protegidoProcedimiento,
} from "../trpc";
import {
  cambiarUsuarioPacienteDto,
  codigoInvitacionDto,
  darAccesoPortalDto,
  generarInvitacionPortalDto,
  pacienteAccesoDto,
  restablecerPasswordPacienteDto,
  revisarEmailPacienteDto,
  sugerirNombreUsuarioDto,
} from "@/aplicacion/dtos/acceso-portal.dto";
import {
  ejecutarEnNutricionista,
  ejecutarGlobal,
} from "@/infraestructura/multitenancy/contextoTenant";
import { limitadorInvitacionPortal } from "@/infraestructura/seguridad/LimitadorTasa";
import type { Contexto } from "../contexto";

/**
 * Router del acceso al portal de los pacientes (migración 80). Ver
 * docs/CUENTAS-PACIENTE.md.
 *
 * Lo del PROFESIONAL (la ficha) corre en su consultorio, como todo. Lo del
 * PACIENTE —canjear un código— cruza consultorios: el código es de un
 * consultorio que todavía no es de la persona. Por eso va en dos pasos: con
 * alcance global se averigua SOLO de qué consultorio es, y el resto corre
 * dentro de ese consultorio, con el filtro de inquilino de siempre.
 */
export const routerAccesoPortal = crearRouter({
  obtener: nutricionistaProcedimiento
    .input(pacienteAccesoDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.accesoPortal.obtener(input.pacienteId);
    }),

  darAcceso: nutricionistaProcedimiento
    .input(darAccesoPortalDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.accesoPortal.darAcceso(input);
    }),

  generarInvitacion: nutricionistaProcedimiento
    .input(generarInvitacionPortalDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.accesoPortal.generarInvitacion(input);
    }),

  restablecerPassword: nutricionistaProcedimiento
    .input(restablecerPasswordPacienteDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.accesoPortal.restablecerPassword(input);
    }),

  cambiarUsuario: nutricionistaProcedimiento
    .input(cambiarUsuarioPacienteDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.accesoPortal.cambiarUsuario(input);
    }),

  /** Mientras se escribe el email de un paciente: repetido, ¿sirve para entrar? */
  revisarEmail: nutricionistaProcedimiento
    .input(revisarEmailPacienteDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.accesoPortal.revisarEmail(
        input.email,
        input.pacienteId ?? null,
      );
    }),

  sugerirNombreUsuario: nutricionistaProcedimiento
    .input(sugerirNombreUsuarioDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.accesoPortal.sugerirNombreUsuario(
        input.nombre,
        input.apellido,
      );
    }),

  /** Antes de confirmar: de qué profesional y a nombre de quién. */
  previsualizarInvitacion: protegidoProcedimiento
    .input(codigoInvitacionDto)
    .mutation(async ({ ctx, input }) => {
      const usuarioId = soloPaciente(ctx.usuario);
      limitar(usuarioId, ctx.ip);
      const consultorio = await ejecutarGlobal(() =>
        ctx.servicios.accesoPortal.ubicarInvitacion(input.codigo),
      );
      return await ejecutarEnNutricionista(consultorio, () =>
        ctx.servicios.accesoPortal.previsualizarInvitacion(
          usuarioId,
          input.codigo,
        ),
      );
    }),

  canjearInvitacion: protegidoProcedimiento
    .input(codigoInvitacionDto)
    .mutation(async ({ ctx, input }) => {
      const usuarioId = soloPaciente(ctx.usuario);
      limitar(usuarioId, ctx.ip);
      const consultorio = await ejecutarGlobal(() =>
        ctx.servicios.accesoPortal.ubicarInvitacion(input.codigo),
      );
      return await ejecutarEnNutricionista(consultorio, () =>
        ctx.servicios.accesoPortal.canjearInvitacion(usuarioId, input.codigo),
      );
    }),
});

/** Un código se canjea desde la cuenta de un PACIENTE, nunca otra. */
function soloPaciente(usuario: NonNullable<Contexto["usuario"]>): string {
  if (usuario.rol !== "PACIENTE") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Los códigos de invitación se canjean desde una cuenta de paciente.",
    });
  }
  return usuario.id;
}

/** Tope de intentos por cuenta y por IP (ver `limitadorInvitacionPortal`). */
function limitar(usuarioId: string, ip: string): void {
  const porCuenta = limitadorInvitacionPortal.intentar(`cuenta:${usuarioId}`);
  const porIp = limitadorInvitacionPortal.intentar(`ip:${ip}`);
  if (!porCuenta.permitido || !porIp.permitido) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message:
        "Probaste demasiados códigos. Esperá un rato y revisá que el código esté bien copiado.",
    });
  }
}
