import { z } from "zod";
import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import { idArchivoDto } from "@/aplicacion/dtos/archivo.dto";

/**
 * Router de Archivos (solo metadatos).
 * La subida y descarga van por route handlers (/api/archivos) porque tRPC
 * no transporta multipart; acá solo listado y borrado.
 */
export const routerArchivos = crearRouter({
  obtenerDePaciente: nutricionistaProcedimiento
    .input(z.object({ pacienteId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.archivo.listarDePaciente(input.pacienteId);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  eliminar: nutricionistaProcedimiento
    .input(idArchivoDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.archivo.eliminar(input.id);
        return { eliminado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),
});
