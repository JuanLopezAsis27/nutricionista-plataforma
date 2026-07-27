import type { IPlantillaEmailRepositorio } from "../../repositorios/IPlantillaEmailRepositorio";
import type { IServicioEmail } from "../../servicios/IServicioEmail";
import { CLAVE_BIENVENIDA } from "../../entidades/PlantillaEmail";

/**
 * Caso de uso: enviar el email de bienvenida a un paciente recién dado de alta.
 * Renderiza la plantilla de sistema BIENVENIDA con su nombre y el del
 * profesional. Devuelve `true` si se envió (hay email y plantilla).
 */
export class EnviarEmailDeBienvenida {
  constructor(
    private readonly plantillas: IPlantillaEmailRepositorio,
    private readonly servicioEmail: IServicioEmail,
    private readonly nombreProfesional: string,
  ) {}

  async ejecutar(nombrePaciente: string, email: string | null): Promise<boolean> {
    if (!email) return false;
    const plantilla = await this.plantillas.obtenerPorClave(CLAVE_BIENVENIDA);
    if (!plantilla) return false;

    const { asunto, html } = plantilla.renderizar({
      paciente: nombrePaciente,
      profesional: this.nombreProfesional,
    });
    await this.servicioEmail.enviar({ para: email, asunto, html });
    return true;
  }
}
