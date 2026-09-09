import type { ObtenerConfiguracionRecordatorios } from "@/aplicacion/casos-de-uso/recordatorios/ObtenerConfiguracionRecordatorios";
import type { GuardarConfiguracionRecordatorios } from "@/aplicacion/casos-de-uso/recordatorios/GuardarConfiguracionRecordatorios";
import type { IProveedorWhatsapp } from "@/dominio/servicios/IProveedorWhatsapp";
import type { ICuentaConectadaRepositorio } from "@/dominio/repositorios/ICuentaConectadaRepositorio";
import type {
  ConfiguracionRecordatoriosSalidaDto,
  GuardarConfiguracionRecordatoriosDto,
} from "../../dtos/recordatorios.dto";

/**
 * La POLÍTICA de recordatorios: qué medios están activos y cuándo salen.
 *
 * Depende del proveedor de WhatsApp y de las cuentas conectadas, y no por
 * capricho: la salida suma al estado guardado el de las integraciones de las
 * que cada medio depende. Sin eso la pantalla mostraría "calendario activo" en
 * un consultorio sin Google conectado, que es prometer un aviso que no sale.
 */
export class ServicioConfiguracionRecordatorios {
  constructor(
    private readonly obtenerUC: ObtenerConfiguracionRecordatorios,
    private readonly guardarUC: GuardarConfiguracionRecordatorios,
    private readonly proveedor: IProveedorWhatsapp,
    private readonly cuentas: ICuentaConectadaRepositorio | null,
  ) {}

  async obtener(): Promise<ConfiguracionRecordatoriosSalidaDto> {
    const config = await this.obtenerUC.ejecutar();
    return this.aSalida(config.aPrimitivos());
  }

  async guardar(
    cambios: GuardarConfiguracionRecordatoriosDto,
  ): Promise<ConfiguracionRecordatoriosSalidaDto> {
    const config = await this.guardarUC.ejecutar(cambios);
    return this.aSalida(config.aPrimitivos());
  }

  /** Estado guardado + estado real de las integraciones de las que depende. */
  private async aSalida(
    datos: Omit<
      ConfiguracionRecordatoriosSalidaDto,
      "whatsappConectado" | "googleConectado"
    > & { id: string },
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
}
