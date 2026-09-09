import { crearRouter, protegidoProcedimiento } from "../trpc";
import {
  cambiarFotoPerfilDto,
  cambiarPasswordDto,
} from "@/aplicacion/dtos/perfil.dto";

/**
 * Router de "Mi perfil": la cuenta de quien está mirando.
 *
 * Todo es `protegidoProcedimiento` —cualquier rol autenticado— y ninguno de los
 * procedimientos recibe de quién es el perfil: el `usuarioId` sale SIEMPRE de
 * `ctx.usuario`. Es lo que hace que no exista la pregunta "¿puede tocar el
 * perfil de otro?": no hay forma de nombrar a otro.
 *
 * La foto se sube antes por `/api/archivos` (multipart, contexto `perfil`) y
 * acá solo llega su id: los archivos nunca viajan por tRPC.
 */
export const routerPerfil = crearRouter({
  mio: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.perfil.obtener(ctx.usuario.id);
  }),

  cambiarFoto: protegidoProcedimiento
    .input(cambiarFotoPerfilDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.perfil.cambiarFoto(
        ctx.usuario.id,
        input.archivoId,
      );
    }),

  cambiarPassword: protegidoProcedimiento
    .input(cambiarPasswordDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.perfil.cambiarPassword(ctx.usuario.id, input);
    }),
});
