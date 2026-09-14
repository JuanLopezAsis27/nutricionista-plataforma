import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import {
  guardarPromptIADto,
  restablecerPromptIADto,
} from "@/aplicacion/dtos/promptsIA.dto";

/**
 * Router de los system prompts de la IA (solo NUTRICIONISTA).
 *
 * Es del profesional y no del paciente por lo obvio y por lo no tan obvio: el
 * prompt del asistente del paciente es justamente el que le pone los límites
 * clínicos a lo que la IA le puede contestar a esa persona. Quien lo edita
 * tiene que ser quien responde por ellos.
 */
export const routerPromptsIA = crearRouter({
  listar: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.promptsIA.listar();
  }),

  guardar: nutricionistaProcedimiento
    .input(guardarPromptIADto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.promptsIA.guardar(input.clave, input.texto);
      return { ok: true };
    }),

  restablecer: nutricionistaProcedimiento
    .input(restablecerPromptIADto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.promptsIA.restablecer(input.clave);
      return { ok: true };
    }),
});
