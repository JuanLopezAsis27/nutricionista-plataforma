import type { ObtenerConfiguracion } from "@/aplicacion/casos-de-uso/configuracion/ObtenerConfiguracion";
import type { GuardarConfiguracion } from "@/aplicacion/casos-de-uso/configuracion/GuardarConfiguracion";
import type { ObtenerNombreProfesional } from "@/aplicacion/casos-de-uso/configuracion/ObtenerNombreProfesional";
import type { CambiarNombreProfesional } from "@/aplicacion/casos-de-uso/configuracion/CambiarNombreProfesional";
import type { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import type {
  GuardarConfiguracionDto,
  ConfiguracionSalidaDto,
} from "../dtos/configuracion.dto";

/**
 * Servicio de aplicación de la Configuración del consultorio: lee y guarda las
 * preferencias del profesional (membrete, PDF, antropometría…).
 *
 * El NOMBRE del profesional no es de la configuración —vive en
 * `nutricionistas.nombre` desde la migración 74—, pero la pantalla lo edita en
 * el mismo formulario y los PDF lo leen junto con el membrete. Por eso viaja
 * en la misma entrada y la misma salida, y es acá donde se separa: cada parte
 * va a su tabla por su caso de uso.
 */
export class ServicioConfiguracion {
  constructor(
    private readonly obtenerUC: ObtenerConfiguracion,
    private readonly guardarUC: GuardarConfiguracion,
    private readonly obtenerNombreUC: ObtenerNombreProfesional,
    private readonly cambiarNombreUC: CambiarNombreProfesional,
  ) {}

  async obtener(): Promise<ConfiguracionSalidaDto> {
    return ServicioConfiguracion.aSalida(
      await this.obtenerUC.ejecutar(),
      await this.obtenerNombreUC.ejecutar(),
    );
  }

  async guardar({
    nombreProfesional,
    ...cambios
  }: GuardarConfiguracionDto): Promise<ConfiguracionSalidaDto> {
    // El nombre primero: es el único que se rechaza por vacío, y así un
    // rechazo no deja la configuración guardada a medias.
    const nombre =
      nombreProfesional !== undefined
        ? await this.cambiarNombreUC.ejecutar(nombreProfesional)
        : await this.obtenerNombreUC.ejecutar();
    return ServicioConfiguracion.aSalida(
      await this.guardarUC.ejecutar(cambios),
      nombre,
    );
  }

  private static aSalida(
    config: ConfiguracionConsultorio,
    nombreProfesional: string,
  ): ConfiguracionSalidaDto {
    return { ...config.aPrimitivos(), nombreProfesional };
  }
}
