import { crearRouter, publicoProcedimiento } from "../trpc";
import { ejecutarGlobal } from "@/infraestructura/multitenancy/contextoTenant";
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
      return await ejecutarGlobal(() =>
        ctx.servicios.autenticacion.solicitarRecuperacion(input),
      );
    }),

  // Restablece la contraseña con el token recibido por email.
  restablecer: publicoProcedimiento
    .input(restablecerPasswordDto)
    .mutation(async ({ ctx, input }) => {
      return await ejecutarGlobal(() => ctx.servicios.autenticacion.restablecer(input));
    }),
});
