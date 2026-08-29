import type { ListarPlantillas } from "@/dominio/casos-de-uso/secretaria/ListarPlantillas";
import type { ObtenerPlantilla } from "@/dominio/casos-de-uso/secretaria/ObtenerPlantilla";
import type { CrearPlantilla } from "@/dominio/casos-de-uso/secretaria/CrearPlantilla";
import type { ActualizarPlantilla } from "@/dominio/casos-de-uso/secretaria/ActualizarPlantilla";
import type { EliminarPlantilla } from "@/dominio/casos-de-uso/secretaria/EliminarPlantilla";
import type {
  EnviarEmailDePrueba,
  ResultadoPrueba,
} from "@/dominio/casos-de-uso/secretaria/EnviarEmailDePrueba";
import type { ListarEmailsEnviados } from "@/dominio/casos-de-uso/secretaria/ListarEmailsEnviados";
import type { PlantillaEmail } from "@/dominio/entidades/PlantillaEmail";
import type {
  CrearPlantillaDto,
  ActualizarPlantillaDto,
  EnviarPruebaDto,
  PlantillaSalidaDto,
  EmailEnviadoSalidaDto,
} from "../dtos/secretaria.dto";

/**
 * Servicio de aplicación de Secretaría: plantillas de email, envío de emails de
 * prueba y auditoría de envíos.
 *
 * El envío de los recordatorios de turno NO está acá: es uno de los tres
 * medios de una misma política y vive en `ServicioRecordatorios`. Lo que sí es
 * de Secretaría es el TEXTO de la plantilla con la que salen.
 */
export class ServicioSecretaria {
  constructor(
    private readonly listarPlantillasUC: ListarPlantillas,
    private readonly obtenerPlantillaUC: ObtenerPlantilla,
    private readonly crearPlantillaUC: CrearPlantilla,
    private readonly actualizarPlantillaUC: ActualizarPlantilla,
    private readonly eliminarPlantillaUC: EliminarPlantilla,
    private readonly enviarPruebaUC: EnviarEmailDePrueba,
    private readonly listarEmailsUC: ListarEmailsEnviados,
  ) {}

  // --- Plantillas ----------------------------------------------------------

  async listarPlantillas(): Promise<PlantillaSalidaDto[]> {
    const plantillas = await this.listarPlantillasUC.ejecutar();
    return plantillas.map(ServicioSecretaria.plantillaASalida);
  }

  async obtenerPlantilla(id: string): Promise<PlantillaSalidaDto> {
    return ServicioSecretaria.plantillaASalida(
      await this.obtenerPlantillaUC.ejecutar(id),
    );
  }

  async crearPlantilla(datos: CrearPlantillaDto): Promise<PlantillaSalidaDto> {
    return ServicioSecretaria.plantillaASalida(
      await this.crearPlantillaUC.ejecutar(datos),
    );
  }

  async actualizarPlantilla(
    datos: ActualizarPlantillaDto,
  ): Promise<PlantillaSalidaDto> {
    return ServicioSecretaria.plantillaASalida(
      await this.actualizarPlantillaUC.ejecutar(datos),
    );
  }

  async eliminarPlantilla(id: string): Promise<void> {
    await this.eliminarPlantillaUC.ejecutar(id);
  }

  // --- Envíos --------------------------------------------------------------

  async enviarEmailDePrueba(datos: EnviarPruebaDto): Promise<ResultadoPrueba> {
    return this.enviarPruebaUC.ejecutar(datos.plantillaId, datos.para);
  }

  async listarEmailsRecientes(
    limite?: number,
  ): Promise<EmailEnviadoSalidaDto[]> {
    const emails = await this.listarEmailsUC.ejecutar(limite);
    return emails.map((e) => e.aPrimitivos());
  }

  private static plantillaASalida(
    plantilla: PlantillaEmail,
  ): PlantillaSalidaDto {
    return plantilla.aPrimitivos();
  }
}
