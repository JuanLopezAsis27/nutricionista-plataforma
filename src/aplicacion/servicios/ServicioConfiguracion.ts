import type { ObtenerConfiguracion } from "@/dominio/casos-de-uso/configuracion/ObtenerConfiguracion";
import type { GuardarConfiguracion } from "@/dominio/casos-de-uso/configuracion/GuardarConfiguracion";
import type { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import type {
  GuardarConfiguracionDto,
  ConfiguracionSalidaDto,
} from "../dtos/configuracion.dto";

/**
 * Servicio de aplicación de la Configuración del consultorio: lee y guarda las
 * preferencias del profesional (duración/horarios de turnos, membrete).
 */
export class ServicioConfiguracion {
  constructor(
    private readonly obtenerUC: ObtenerConfiguracion,
    private readonly guardarUC: GuardarConfiguracion,
  ) {}

  async obtener(): Promise<ConfiguracionSalidaDto> {
    return ServicioConfiguracion.aSalida(await this.obtenerUC.ejecutar());
  }

  async guardar(cambios: GuardarConfiguracionDto): Promise<ConfiguracionSalidaDto> {
    return ServicioConfiguracion.aSalida(await this.guardarUC.ejecutar(cambios));
  }

  private static aSalida(config: ConfiguracionConsultorio): ConfiguracionSalidaDto {
    return config.aPrimitivos();
  }
}
