import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import {
  crearPacienteConAccesoDto,
  actualizarPacienteDto,
  idPacienteDto,
  listarPacientesDto,
  archivarPacienteDto,
  interpretarFichaPacienteDto,
  crearPacienteDesdeFichaDto,
} from "@/aplicacion/dtos/paciente.dto";

/**
 * Router de Pacientes (presentación → aplicación).
 *
 * Todos los procedimientos son exclusivos del NUTRICIONISTA y delegan en
 * ctx.servicios.paciente. Los errores de dominio los traduce el middleware de
 * `trpc.ts`; los resolvers no los capturan.
 */
export const routerPacientes = crearRouter({
  obtenerTodos: nutricionistaProcedimiento
    .input(listarPacientesDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.paciente.obtenerPacientes(input);
    }),

  obtenerPorId: nutricionistaProcedimiento
    .input(idPacienteDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.paciente.obtenerPacientePorId(input.id);
    }),

  crear: nutricionistaProcedimiento
    .input(crearPacienteConAccesoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.paciente.crearPaciente(input);
    }),

  /**
   * Lee una ficha (PDF, Word o foto) ya subida y devuelve lo que la IA
   * reconoció, para precargar el alta. NO crea nada: el paciente lo da de alta
   * el profesional con `crearDesdeFicha`, después de revisar.
   */
  interpretarFicha: nutricionistaProcedimiento
    .input(interpretarFichaPacienteDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.paciente.interpretarFicha(input);
    }),

  /** Alta confirmada desde una ficha: el paciente y todo lo que traía. */
  crearDesdeFicha: nutricionistaProcedimiento
    .input(crearPacienteDesdeFichaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.paciente.crearPacienteDesdeFicha(input);
    }),

  actualizar: nutricionistaProcedimiento
    .input(actualizarPacienteDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.paciente.actualizarPaciente(input);
    }),

  /**
   * Baja lógica: saca al paciente de los listados y de las estadísticas pero
   * conserva su historia clínica. Es la alternativa a `eliminar`, que borra en
   * cascada turnos, antropometrías y laboratorios.
   */
  archivar: nutricionistaProcedimiento
    .input(archivarPacienteDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.paciente.archivarPaciente(
        input.id,
        input.motivo ?? null,
      );
    }),

  reactivar: nutricionistaProcedimiento
    .input(idPacienteDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.paciente.reactivarPaciente(input.id);
    }),

  eliminar: nutricionistaProcedimiento
    .input(idPacienteDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.paciente.eliminarPaciente(input.id);
      return { eliminado: true };
    }),
});
