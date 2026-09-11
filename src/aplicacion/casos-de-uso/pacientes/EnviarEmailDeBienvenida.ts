import type { IPlantillaEmailRepositorio } from "@/dominio/repositorios/IPlantillaEmailRepositorio";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import { CLAVE_BIENVENIDA } from "@/dominio/entidades/PlantillaEmail";
import { variablesBienvenida } from "@/aplicacion/casos-de-uso/secretaria/variables";

/** Lo que hace falta para darle la bienvenida a un paciente recién creado. */
export interface DatosBienvenida {
  nombrePaciente: string;
  /** Email del paciente, que es también el usuario con el que inicia sesión. */
  email: string | null;
  /** Contraseña de su cuenta, tal como la cargó el profesional en el alta. */
  contrasena: string;
}

/**
 * Caso de uso: enviar el email de bienvenida a un paciente recién dado de alta.
 * Renderiza la plantilla de sistema BIENVENIDA y devuelve `true` si se envió
 * (hay email y plantilla).
 *
 * Además del nombre del paciente y del profesional, la plantilla puede llevar
 * sus datos de acceso: {{email}} y {{contrasena}}. Es el ÚNICO momento en que
 * la contraseña se puede mandar: existe en texto plano solo durante el alta
 * —la escribe el profesional y la cuenta la guarda hasheada acto seguido—, así
 * que un reenvío posterior ya no la tendría. Tampoco queda escrita en el
 * sistema: la bienvenida no pasa por el log de envíos, que de todos modos
 * guarda solo el asunto y nunca el cuerpo.
 *
 * Mandarla es decisión del profesional: solo sale si pone {{contrasena}} en la
 * plantilla.
 */
export class EnviarEmailDeBienvenida {
  constructor(
    private readonly plantillas: IPlantillaEmailRepositorio,
    private readonly servicioEmail: IServicioEmail,
    private readonly nombreProfesional: string,
  ) {}

  async ejecutar(datos: DatosBienvenida): Promise<boolean> {
    if (!datos.email) return false;
    const plantilla = await this.plantillas.obtenerPorClave(CLAVE_BIENVENIDA);
    if (!plantilla) return false;

    const { asunto, html } = plantilla.renderizar(
      variablesBienvenida({
        nombrePaciente: datos.nombrePaciente,
        nombreProfesional: this.nombreProfesional,
        email: datos.email,
        contrasena: datos.contrasena,
      }),
    );
    await this.servicioEmail.enviar({ para: datos.email, asunto, html });
    return true;
  }
}
