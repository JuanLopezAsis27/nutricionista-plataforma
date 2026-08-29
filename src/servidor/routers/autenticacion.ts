import { TRPCError } from "@trpc/server";
import { crearRouter, publicoProcedimiento } from "../trpc";
import { ejecutarGlobal } from "@/infraestructura/multitenancy/contextoTenant";
import {
  limitadorRecuperacion,
  limitadorRestablecer,
} from "@/infraestructura/seguridad/LimitadorTasa";
import {
  solicitarRecuperacionDto,
  restablecerPasswordDto,
} from "@/aplicacion/dtos/autenticacion.dto";

/**
 * Router de autenticación: recuperación de contraseña.
 *
 * Son procedimientos PÚBLICOS (sin sesión). Como el flujo consulta/actualiza la
 * tabla de usuarios (que es de inquilino) sin un inquilino resuelto, se corre
 * con alcance GLOBAL — igual que el login (ver auth.ts).
 */
export const routerAutenticacion = crearRouter({
  // Pide el enlace de recuperación. Siempre responde OK (no revela si el email
  // existe), para no permitir enumeración de cuentas.
  solicitarRecuperacion: publicoProcedimiento
    .input(solicitarRecuperacionDto)
    .mutation(async ({ ctx, input }) => {
      // Límite de tasa por email Y por IP.
      //
      // Es público y cada llamada dispara un correo, así que sin tope alcanza
      // con un bucle para inundar la casilla de una persona y, de paso, quemar
      // la cuota del SMTP hasta que el dominio caiga en listas negras y dejen
      // de salir TODOS los mails de la app.
      //
      // Por email protege a la víctima; por IP corta al que barre muchas
      // direcciones desde un mismo origen. Se comprueban los dos antes de
      // hacer nada.
      const email = input.email.trim().toLowerCase();
      const porEmail = limitadorRecuperacion.intentar(`email:${email}`);
      const porIp = limitadorRecuperacion.intentar(`ip:${ctx.ip}`);

      if (!porEmail.permitido || !porIp.permitido) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "Ya pediste el enlace hace poco. Revisá tu correo (mirá también el spam) y volvé a intentar en unos minutos.",
        });
      }

      return await ejecutarGlobal(() =>
        ctx.servicios.autenticacion.solicitarRecuperacion({ ...input, email }),
      );
    }),

  // Restablece la contraseña con el token recibido por email.
  restablecer: publicoProcedimiento
    .input(restablecerPasswordDto)
    .mutation(async ({ ctx, input }) => {
      // También acá: el token es de 256 bits y adivinarlo es inviable, pero sin
      // tope nada impide intentarlo a máxima velocidad, y cada intento es una
      // consulta a la base.
      const porIp = limitadorRestablecer.intentar(`restablecer:${ctx.ip}`);
      if (!porIp.permitido) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Demasiados intentos. Probá de nuevo en unos minutos.",
        });
      }

      return await ejecutarGlobal(() =>
        ctx.servicios.autenticacion.restablecer(input),
      );
    }),
});
