import type { IPlantillaEmailRepositorio } from "@/dominio/repositorios/IPlantillaEmailRepositorio";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";
import {
  CLAVE_BIENVENIDA,
  CLAVE_BIENVENIDA_CUENTA_EXISTENTE,
} from "@/dominio/entidades/PlantillaEmail";
import { variablesBienvenida } from "@/aplicacion/casos-de-uso/secretaria/variables";

/** Lo que hace falta para darle la bienvenida a un paciente recién creado. */
export interface DatosBienvenida {
  nombrePaciente: string;
  /**
   * A dónde se manda: el email de CONTACTO de la ficha, que puede no ser con
   * qué entra (dos hermanos con el de la madre; migración 79). Sin email, no
   * sale nada.
   */
  email: string | null;
  /** Con qué inicia sesión: email o nombre de usuario (`{{usuario}}`). */
  usuario: string;
  /** Contraseña de su cuenta, tal como la cargó el profesional en el alta. */
  contrasena: string;
  /**
   * La cuenta no es solo de este consultorio (la persona ya la tenía, o la
   * comparte con otro): sale la plantilla BIENVENIDA_CUENTA_EXISTENTE, que no
   * lleva contraseña, en vez de la de siempre.
   */
  cuentaExistente?: boolean;
}

/**
 * Caso de uso: enviar el email de bienvenida a un paciente recién dado de alta.
 * Renderiza la plantilla de sistema BIENVENIDA y devuelve `true` si se envió
 * (hay email y plantilla).
 *
 * Además del nombre del paciente y del profesional, la plantilla puede llevar
 * sus datos de acceso: {{usuario}} (o {{email}}, que dice lo mismo) y
 * {{contrasena}}. Es el ÚNICO momento en que
 * la contraseña se puede mandar: existe en texto plano solo durante el alta
 * —la escribe el profesional y la cuenta la guarda hasheada acto seguido—, así
 * que un reenvío posterior ya no la tendría. Tampoco queda escrita en el
 * sistema: la bienvenida no pasa por el log de envíos, que de todos modos
 * guarda solo el asunto y nunca el cuerpo.
 *
 * Mandarla es decisión del profesional: solo sale si pone {{contrasena}} en la
 * plantilla.
 *
 * A quien ya tenía cuenta (paciente también de otro consultorio) le llega otra
 * plantilla, sin contraseña: «entrá con la que ya usás».
 */
export class EnviarEmailDeBienvenida {
  constructor(
    private readonly plantillas: IPlantillaEmailRepositorio,
    private readonly servicioEmail: IServicioEmail,
    /** Da {{profesional}}: el nombre del consultorio que da el alta. */
    private readonly nutricionistas: INutricionistaRepositorio,
  ) {}

  /**
   * Si la plantilla de bienvenida lleva `{{contrasena}}`. El alta siempre tiene
   * la contraseña en la mano; el envío manual no, y tiene que saber ANTES de
   * mandar si le hace falta generar una.
   */
  async pideContrasena(): Promise<boolean> {
    const plantilla = await this.plantillas.obtenerPorClave(CLAVE_BIENVENIDA);
    return plantilla?.usaVariable("contrasena") ?? false;
  }

  async ejecutar(datos: DatosBienvenida): Promise<boolean> {
    if (!datos.email) return false;
    const plantilla = await this.plantillas.obtenerPorClave(
      datos.cuentaExistente
        ? CLAVE_BIENVENIDA_CUENTA_EXISTENTE
        : CLAVE_BIENVENIDA,
    );
    if (!plantilla) return false;

    const { asunto, html } = plantilla.renderizar(
      variablesBienvenida({
        nombrePaciente: datos.nombrePaciente,
        nombreProfesional: await this.nutricionistas.nombreDelActual(),
        usuario: datos.usuario,
        // Nunca en la de cuenta existente: la contraseña es de la persona.
        contrasena: datos.cuentaExistente ? "" : datos.contrasena,
      }),
    );
    await this.servicioEmail.enviar({ para: datos.email, asunto, html });
    return true;
  }
}
