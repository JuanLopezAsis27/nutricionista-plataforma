import {
  crearRouter,
  nutricionistaProcedimiento,
  protegidoProcedimiento,
} from "../trpc";
import { pacienteDeSesion } from "@/dominio/servicios/politicaAcceso";
import {
  crearPlanificacionDto,
  crearPlanificacionParaPacienteDto,
  actualizarPlanificacionDto,
  idPlanificacionDto,
  listarPlanificacionesDto,
  moverPlanificacionDto,
  asignarPlanificacionDto,
  desasignarPlanificacionDto,
  idPacientePlanificacionDto,
} from "@/aplicacion/dtos/planificacionDeportiva.dto";
import {
  grupoPlanDto,
  actualizarGrupoPlanDto,
  idGrupoPlanDto,
} from "@/aplicacion/dtos/plan.dto";

/**
 * Router de la planificación deportiva (migración 94): planificaciones por
 * deporte —por ahora, carreras de running y trail—, sus carpetas y sus
 * asignaciones a pacientes y competencias.
 *
 * Es un router aparte de `deportivo` (perfil y calendario) porque es otro
 * agregado: el perfil dice QUÉ deporte hace el paciente y cuándo compite; la
 * planificación, QUÉ COMER en esa competencia.
 *
 * La gestión es del NUTRICIONISTA. El paciente solo lee las suyas (`mias`),
 * con el pacienteId de la sesión: esa lista ES la autorización, y el detalle
 * del portal sale de ella, como las recetas.
 */
export const routerPlanificacionDeportiva = crearRouter({
  listar: nutricionistaProcedimiento
    .input(listarPlanificacionesDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.planificacionDeportiva.listar(input);
    }),

  obtener: nutricionistaProcedimiento
    .input(idPlanificacionDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.planificacionDeportiva.obtener(input.id);
    }),

  crear: nutricionistaProcedimiento
    .input(crearPlanificacionDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.planificacionDeportiva.crear(input);
    }),

  /** Desde la ficha: va a la carpeta del paciente y queda asignada. */
  crearParaPaciente: nutricionistaProcedimiento
    .input(crearPlanificacionParaPacienteDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.planificacionDeportiva.crearParaPaciente(
        input,
      );
    }),

  actualizar: nutricionistaProcedimiento
    .input(actualizarPlanificacionDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.planificacionDeportiva.actualizar(input);
    }),

  eliminar: nutricionistaProcedimiento
    .input(idPlanificacionDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.planificacionDeportiva.eliminar(input.id);
      return { eliminado: true };
    }),

  duplicar: nutricionistaProcedimiento
    .input(idPlanificacionDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.planificacionDeportiva.duplicar(input.id);
    }),

  mover: nutricionistaProcedimiento
    .input(moverPlanificacionDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.planificacionDeportiva.mover(
        input.planificacionId,
        input.grupoId,
      );
      return { movido: true };
    }),

  // --- Carpetas -------------------------------------------------------------

  grupos: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.planificacionDeportiva.grupos();
  }),

  crearGrupo: nutricionistaProcedimiento
    .input(grupoPlanDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.planificacionDeportiva.crearGrupo(input);
    }),

  actualizarGrupo: nutricionistaProcedimiento
    .input(actualizarGrupoPlanDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.planificacionDeportiva.actualizarGrupo(input);
    }),

  eliminarGrupo: nutricionistaProcedimiento
    .input(idGrupoPlanDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.planificacionDeportiva.eliminarGrupo(input.id);
      return { eliminado: true };
    }),

  // --- Asignaciones ---------------------------------------------------------

  asignar: nutricionistaProcedimiento
    .input(asignarPlanificacionDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.planificacionDeportiva.asignar(input);
      return { asignado: true };
    }),

  desasignar: nutricionistaProcedimiento
    .input(desasignarPlanificacionDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.planificacionDeportiva.desasignar(
        input.planificacionId,
        input.pacienteId,
      );
      return { desasignado: true };
    }),

  delPaciente: nutricionistaProcedimiento
    .input(idPacientePlanificacionDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.planificacionDeportiva.delPaciente(
        input.pacienteId,
      );
    }),

  pacientesDe: nutricionistaProcedimiento
    .input(idPlanificacionDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.planificacionDeportiva.pacientesDe(input.id);
    }),

  // --- Portal del paciente (pacienteId de la sesión) -------------------------

  /** Cuántas tiene: el menú del portal lo pregunta en cada pantalla. */
  cuantasMias: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.planificacionDeportiva.cantidadDelPaciente(
      pacienteDeSesion(ctx.usuario),
    );
  }),

  /** Las planificaciones que le asignaron, con la competencia de cada una. */
  mias: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.planificacionDeportiva.delPaciente(
      pacienteDeSesion(ctx.usuario),
    );
  }),
});
