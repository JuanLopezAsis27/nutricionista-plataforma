import type { ObtenerConfiguracionRecordatorios } from "@/dominio/casos-de-uso/recordatorios/ObtenerConfiguracionRecordatorios";
import type { GuardarConfiguracionRecordatorios } from "@/dominio/casos-de-uso/recordatorios/GuardarConfiguracionRecordatorios";
import type { ListarPlantillasWhatsapp } from "@/dominio/casos-de-uso/recordatorios/ListarPlantillasWhatsapp";
import type { CrearPlantillaWhatsapp } from "@/dominio/casos-de-uso/recordatorios/CrearPlantillaWhatsapp";
import type { ActualizarPlantillaWhatsapp } from "@/dominio/casos-de-uso/recordatorios/ActualizarPlantillaWhatsapp";
import type { EliminarPlantillaWhatsapp } from "@/dominio/casos-de-uso/recordatorios/EliminarPlantillaWhatsapp";
import type { ListarTurnosParaRecordar } from "@/dominio/casos-de-uso/recordatorios/ListarTurnosParaRecordar";
import type { EnviarRecordatoriosMasivos } from "@/dominio/casos-de-uso/recordatorios/EnviarRecordatoriosMasivos";
import type { EnviarRecordatoriosProgramados } from "@/dominio/casos-de-uso/recordatorios/EnviarRecordatoriosProgramados";
import type { ListarSeguimientoRecordatorios } from "@/dominio/casos-de-uso/recordatorios/ListarSeguimientoRecordatorios";
import type { ListarRecordatoriosPendientes } from "@/dominio/casos-de-uso/recordatorios/ListarRecordatoriosPendientes";
import type { ObtenerVistaPreviaRecordatorio } from "@/dominio/casos-de-uso/recordatorios/ObtenerVistaPreviaRecordatorio";
import type { ConfirmarRecordatorioWhatsapp } from "@/dominio/casos-de-uso/recordatorios/ConfirmarRecordatorioWhatsapp";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import type { IProveedorWhatsapp } from "@/dominio/servicios/IProveedorWhatsapp";
import type { ICuentaConectadaRepositorio } from "@/dominio/repositorios/ICuentaConectadaRepositorio";
import type { PlantillaWhatsapp } from "@/dominio/entidades/PlantillaWhatsapp";
import type {
  ActualizarPlantillaWhatsappDto,
  ConfiguracionRecordatoriosSalidaDto,
  EnviarRecordatoriosMasivosDto,
  GuardarConfiguracionRecordatoriosDto,
  GuardarPlantillaWhatsappDto,
  PlantillaWhatsappSalidaDto,
  ResultadoEnvioMasivoSalidaDto,
  ResultadoProgramadosSalidaDto,
  SeguimientoRecordatorioSalidaDto,
  TurnoParaRecordarSalidaDto,
  RecordatorioPendienteSalidaDto,
  RecordatorioSalidaDto,
  VistaPreviaSalidaDto,
  EnviarRecordatorioIndividualDto,
} from "../dtos/recordatorios.dto";

/**
 * Servicio de aplicación de Recordatorios de turno.
 *
 * Reúne los tres medios bajo una sola puerta —WhatsApp, email y calendario—
 * porque para el profesional son una sola decisión ("¿cómo aviso los turnos?")
 * aunque por dentro los ejecuten piezas distintas: el envío por WhatsApp vive
 * acá junto con el del email, y el del calendario en el sincronizador que corre
 * al agendar. Lo que este servicio centraliza es la POLÍTICA; cada medio la lee
 * donde le toca actuar.
 */
export class ServicioRecordatorios {
  constructor(
    private readonly obtenerConfigUC: ObtenerConfiguracionRecordatorios,
    private readonly guardarConfigUC: GuardarConfiguracionRecordatorios,
    private readonly listarPlantillasUC: ListarPlantillasWhatsapp,
    private readonly crearPlantillaUC: CrearPlantillaWhatsapp,
    private readonly actualizarPlantillaUC: ActualizarPlantillaWhatsapp,
    private readonly eliminarPlantillaUC: EliminarPlantillaWhatsapp,
    private readonly listarTurnosUC: ListarTurnosParaRecordar,
    private readonly enviarMasivoUC: EnviarRecordatoriosMasivos,
    private readonly enviarProgramadosUC: EnviarRecordatoriosProgramados,
    private readonly seguimientoUC: ListarSeguimientoRecordatorios,
    private readonly pendientesUC: ListarRecordatoriosPendientes,
    private readonly vistaPreviaUC: ObtenerVistaPreviaRecordatorio,
    private readonly confirmarUC: ConfirmarRecordatorioWhatsapp,
    private readonly proveedor: IProveedorWhatsapp,
    private readonly cuentas: ICuentaConectadaRepositorio | null,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly bus: IBusEventos,
  ) {}

  // --- Configuración -------------------------------------------------------

  async obtenerConfiguracion(): Promise<ConfiguracionRecordatoriosSalidaDto> {
    const config = await this.obtenerConfigUC.ejecutar();
    return this.aSalidaConfig(config.aPrimitivos());
  }

  async guardarConfiguracion(
    cambios: GuardarConfiguracionRecordatoriosDto,
  ): Promise<ConfiguracionRecordatoriosSalidaDto> {
    const config = await this.guardarConfigUC.ejecutar(cambios);
    return this.aSalidaConfig(config.aPrimitivos());
  }

  // --- Plantillas ----------------------------------------------------------

  async listarPlantillas(): Promise<PlantillaWhatsappSalidaDto[]> {
    const plantillas = await this.listarPlantillasUC.ejecutar();
    return plantillas.map(ServicioRecordatorios.aSalidaPlantilla);
  }

  async crearPlantilla(
    datos: GuardarPlantillaWhatsappDto,
  ): Promise<PlantillaWhatsappSalidaDto> {
    return ServicioRecordatorios.aSalidaPlantilla(
      await this.crearPlantillaUC.ejecutar({
        nombre: datos.nombre,
        cuerpo: datos.cuerpo,
        claveMeta: datos.claveMeta ?? null,
        idiomaMeta: datos.idiomaMeta ?? "es_AR",
        variablesMeta: datos.variablesMeta ?? [],
        predeterminada: datos.predeterminada ?? false,
        activa: datos.activa ?? true,
      }),
    );
  }

  async actualizarPlantilla(
    datos: ActualizarPlantillaWhatsappDto,
  ): Promise<PlantillaWhatsappSalidaDto> {
    const { id, ...cambios } = datos;
    return ServicioRecordatorios.aSalidaPlantilla(
      await this.actualizarPlantillaUC.ejecutar(id, cambios),
    );
  }

  async eliminarPlantilla(id: string): Promise<void> {
    await this.eliminarPlantillaUC.ejecutar(id);
  }

  // --- Envío ---------------------------------------------------------------

  async listarTurnosParaRecordar(
    dias?: number,
  ): Promise<TurnoParaRecordarSalidaDto[]> {
    return this.listarTurnosUC.ejecutar(dias);
  }

  async enviarMasivo(
    datos: EnviarRecordatoriosMasivosDto,
    usuarioId: string,
  ): Promise<ResultadoEnvioMasivoSalidaDto> {
    return this.enviarMasivoUC.ejecutar({
      turnoIds: datos.turnoIds,
      plantillaId: datos.plantillaId,
      forzar: datos.forzar,
      usuarioId,
    });
  }

  /**
   * Corrida del barrido automático, con TODOS los medios. La dispara el worker
   * por cron y también el botón "Enviar ahora" de la pantalla, que pasa
   * `ignorarHora` porque ahí la decisión ya la tomó el profesional apretando.
   */
  async enviarProgramados(
    ignorarHora = false,
  ): Promise<ResultadoProgramadosSalidaDto> {
    const resultado = await this.enviarProgramadosUC.ejecutar({ ignorarHora });

    // Aviso en tiempo real a la campana de cada nutricionista. Funciona también
    // desde el worker: el bus publica por Postgres NOTIFY, que cruza procesos.
    if (resultado.email.enviados > 0) {
      for (const nutri of await this.usuarios.listarPorRol("NUTRICIONISTA")) {
        await this.bus.publicar({
          tipo: "correo.enviado",
          usuarioId: nutri.id,
          datos: { enviados: resultado.email.enviados },
        });
      }
    }
    return resultado;
  }

  /** El texto ya armado de un turno, para retocarlo antes de mandarlo. */
  async obtenerVistaPrevia(
    turnoId: string,
    plantillaId?: string | null,
  ): Promise<VistaPreviaSalidaDto> {
    return this.vistaPreviaUC.ejecutar(turnoId, plantillaId);
  }

  /**
   * Envío a UN paciente, con el texto posiblemente retocado a mano.
   *
   * NO fuerza: abrir el diálogo es elegir el texto, no saltearse la protección
   * contra el doble envío. Antes forzaba, y el resultado era que el diálogo
   * reenviaba siempre —incluso a quien acababa de recibir el aviso— mientras la
   * casilla de reenvío decía lo contrario. Para insistir dentro del margen hay
   * que tildarla, igual que en el envío masivo.
   */
  async enviarIndividual(
    datos: EnviarRecordatorioIndividualDto,
    usuarioId: string,
  ): Promise<ResultadoEnvioMasivoSalidaDto> {
    return this.enviarMasivoUC.ejecutar({
      turnoIds: [datos.turnoId],
      plantillaId: datos.plantillaId,
      mensaje: datos.mensaje,
      forzar: datos.forzar ?? false,
      usuarioId,
    });
  }

  // --- Confirmación de los envíos por enlace -------------------------------

  /**
   * Los recordatorios que quedaron sin confirmar. Es la contracara del enlace
   * `wa.me`: la app abre el chat pero WhatsApp no le devuelve nada, así que el
   * envío lo declara el profesional y necesita dónde hacerlo.
   */
  async listarPendientes(): Promise<RecordatorioPendienteSalidaDto[]> {
    return this.pendientesUC.ejecutar();
  }

  async confirmarEnvio(
    recordatorioId: string,
    enviado: boolean,
  ): Promise<RecordatorioSalidaDto> {
    const recordatorio = await this.confirmarUC.ejecutar(
      recordatorioId,
      enviado,
    );
    const d = recordatorio.aPrimitivos();
    return {
      id: d.id,
      estado: d.estado,
      creadoEn: d.creadoEn,
      confirmadoEn: d.confirmadoEn,
    };
  }

  // --- Seguimiento ---------------------------------------------------------

  async listarSeguimiento(
    limite?: number,
  ): Promise<SeguimientoRecordatorioSalidaDto[]> {
    return this.seguimientoUC.ejecutar(limite);
  }

  /**
   * Suma al estado guardado el de las integraciones de las que cada medio
   * depende. Sin esto la pantalla mostraría "calendario activo" en un
   * consultorio sin Google conectado, que es prometer un aviso que no sale.
   */
  private async aSalidaConfig(
    datos: Omit<
      ConfiguracionRecordatoriosSalidaDto,
      "whatsappConectado" | "googleConectado"
    > & {
      id: string;
    },
  ): Promise<ConfiguracionRecordatoriosSalidaDto> {
    return {
      whatsappActivo: datos.whatsappActivo,
      whatsappAutomatico: datos.whatsappAutomatico,
      whatsappDiasAntes: datos.whatsappDiasAntes,
      emailActivo: datos.emailActivo,
      emailAutomatico: datos.emailAutomatico,
      emailDiasAntes: datos.emailDiasAntes,
      calendarioActivo: datos.calendarioActivo,
      calendarioInvitarPaciente: datos.calendarioInvitarPaciente,
      calendarioMinutosAntes: datos.calendarioMinutosAntes,
      horaEnvio: datos.horaEnvio,
      horasEntreAvisos: datos.horasEntreAvisos,
      whatsappConectado: (await this.proveedor.modoActual()) === "API",
      googleConectado: this.cuentas
        ? (await this.cuentas.obtener("GOOGLE")) != null
        : false,
    };
  }

  private static aSalidaPlantilla(
    plantilla: PlantillaWhatsapp,
  ): PlantillaWhatsappSalidaDto {
    return {
      ...plantilla.aPrimitivos(),
      admiteEnvioPorApi: plantilla.admiteEnvioPorApi,
    };
  }
}
