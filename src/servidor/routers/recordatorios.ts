import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import {
  guardarConfiguracionRecordatoriosDto,
  guardarPlantillaWhatsappDto,
  actualizarPlantillaWhatsappDto,
  idPlantillaWhatsappDto,
  listarTurnosParaRecordarDto,
  enviarRecordatoriosMasivosDto,
  listarSeguimientoDto,
  confirmarEnvioDto,
  vistaPreviaRecordatorioDto,
  enviarRecordatorioIndividualDto,
} from "@/aplicacion/dtos/recordatorios.dto";

/**
 * Router de Recordatorios de turno (presentación → aplicación).
 *
 * Territorio exclusivo del NUTRICIONISTA: el portal del paciente no configura
 * ni dispara recordatorios.
 */
export const routerRecordatorios = crearRouter({
  // --- Configuración de medios y programación ------------------------------
  configuracion: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.recordatorios.configuracion.obtener();
  }),

  guardarConfiguracion: nutricionistaProcedimiento
    .input(guardarConfiguracionRecordatoriosDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.recordatorios.configuracion.guardar(input);
    }),

  // --- Plantillas ----------------------------------------------------------
  listarPlantillas: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.recordatorios.plantillas.listar();
  }),

  crearPlantilla: nutricionistaProcedimiento
    .input(guardarPlantillaWhatsappDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.recordatorios.plantillas.crear(input);
    }),

  actualizarPlantilla: nutricionistaProcedimiento
    .input(actualizarPlantillaWhatsappDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.recordatorios.plantillas.actualizar(input);
    }),

  eliminarPlantilla: nutricionistaProcedimiento
    .input(idPlantillaWhatsappDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.recordatorios.plantillas.eliminar(input.id);
      return { eliminada: true };
    }),

  // --- Consola de envío ----------------------------------------------------
  turnosParaRecordar: nutricionistaProcedimiento
    .input(listarTurnosParaRecordarDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.recordatorios.envio.listarTurnosParaRecordar(
        input.dias,
      );
    }),

  /** Texto ya armado de un turno. Es una LECTURA: no manda nada. */
  vistaPrevia: nutricionistaProcedimiento
    .input(vistaPreviaRecordatorioDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.recordatorios.envio.obtenerVistaPrevia(
        input.turnoId,
        input.plantillaId,
      );
    }),

  /** Envío a un paciente con el texto retocado en el diálogo. */
  enviarIndividual: nutricionistaProcedimiento
    .input(enviarRecordatorioIndividualDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.recordatorios.envio.enviarIndividual(
        input,
        ctx.usuario.id,
      );
    }),

  enviarMasivo: nutricionistaProcedimiento
    .input(enviarRecordatoriosMasivosDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.recordatorios.envio.enviarMasivo(
        input,
        ctx.usuario.id,
      );
    }),

  /**
   * Disparo manual del barrido programado, además del cron del worker. Va con
   * `ignorarHora`: acá la decisión de mandar ya la tomó el profesional al
   * apretar, y hacerle esperar a la hora configurada no protegería de nada
   * (del duplicado se ocupa el índice único, no el reloj).
   */
  enviarProgramados: nutricionistaProcedimiento.mutation(async ({ ctx }) => {
    return await ctx.servicios.recordatorios.envio.enviarProgramados(true);
  }),

  /**
   * Recordatorios abiertos en WhatsApp que nadie confirmó todavía. Existen
   * porque el enlace wa.me no le devuelve nada a la app: el envío lo declara
   * el profesional, y esta es la bandeja donde lo hace.
   */
  pendientes: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.recordatorios.seguimiento.listarPendientes();
  }),

  confirmarEnvio: nutricionistaProcedimiento
    .input(confirmarEnvioDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.recordatorios.seguimiento.confirmarEnvio(
        input.recordatorioId,
        input.enviado,
      );
    }),

  // --- Seguimiento ---------------------------------------------------------
  seguimiento: nutricionistaProcedimiento
    .input(listarSeguimientoDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.recordatorios.seguimiento.listarSeguimiento(
        input.limite,
      );
    }),
});
