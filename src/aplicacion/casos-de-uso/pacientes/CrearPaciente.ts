import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import { PREFIJO_PAIS_POR_DEFECTO } from "@/dominio/servicios/telefono";
import {
  Paciente,
  type DatosNuevoPaciente,
} from "@/dominio/entidades/Paciente";
import type { Usuario } from "@/dominio/entidades/Usuario";
import type {
  DarAccesoPortal,
  DatosAccesoPortal,
} from "../acceso-portal/DarAccesoPortal";

/** Entrada del dominio: datos del paciente + (opcional) su acceso al portal. */
export interface DatosNuevoPacienteConAcceso extends DatosNuevoPaciente {
  /**
   * Con qué va a entrar al portal. Null = ficha sin portal (el alta rápida
   * desde un turno, o alguien que no lo va a usar): se le puede dar después
   * desde su ficha.
   */
  acceso?: DatosAccesoPortal | null;
}

/**
 * Cómo quedó el acceso al portal:
 * - `CUENTA_NUEVA`: se creó su cuenta (`cuenta` dice con qué entra).
 * - `INVITACION`: su email ya es la cuenta de un paciente de otro consultorio;
 *   la ficha quedó sin portal hasta que canjee un código de invitación.
 * - `SIN_CUENTA`: no se pidió acceso.
 */
export type AccesoAlta =
  | { tipo: "CUENTA_NUEVA"; cuenta: Usuario }
  | { tipo: "INVITACION" }
  | { tipo: "SIN_CUENTA" };

/** Cómo terminó el alta. */
export interface ResultadoAltaPaciente {
  paciente: Paciente;
  acceso: AccesoAlta;
}

/**
 * Caso de uso: dar de alta un paciente y, si se pide, su acceso al portal.
 *
 * La ficha es lo primero y lo único obligatorio. El acceso es opcional desde
 * la migración 80: un paciente puede no tener email ni usar el portal, y el
 * alta rápida desde un turno no lo pide. Cuando se pide, lo resuelve
 * `DarAccesoPortal` —el mismo camino que usa la ficha para darlo después—,
 * que nunca asocia la ficha a una cuenta que ya existía: eso es un código de
 * invitación que canjea la persona.
 *
 * El email de la ficha es de CONTACTO y se puede repetir (migración 79): dos
 * hermanos con el email de la madre son dos fichas válidas.
 *
 * Si el acceso falla (usuario tomado, falta un usuario), se compensa borrando
 * la ficha recién creada: el profesional corrige y vuelve a enviar, sin una
 * ficha a medias que después chocaría consigo misma.
 */
export class CrearPaciente {
  constructor(
    private readonly repositorio: IPacienteRepositorio,
    private readonly configuracion: IConfiguracionRepositorio,
    private readonly darAcceso: DarAccesoPortal,
  ) {}

  async ejecutar(
    datos: DatosNuevoPacienteConAcceso,
  ): Promise<ResultadoAltaPaciente> {
    // El prefijo del consultorio define cómo se canoniza el teléfono a E.164,
    // que es la clave con la que después se resuelve por WhatsApp.
    const paciente = Paciente.crear(
      datos,
      crypto.randomUUID(),
      new Date(),
      await this.prefijoPais(),
    );
    const pacienteCreado = await this.repositorio.crear(paciente);

    if (!datos.acceso) {
      return { paciente: pacienteCreado, acceso: { tipo: "SIN_CUENTA" } };
    }
    try {
      const acceso = await this.darAcceso.ejecutar(
        pacienteCreado.id,
        datos.acceso,
      );
      return { paciente: pacienteCreado, acceso };
    } catch (error) {
      await this.repositorio.eliminar(pacienteCreado.id);
      throw error;
    }
  }

  private async prefijoPais(): Promise<string> {
    const config = await this.configuracion.obtener();
    return config?.whatsappPrefijoPais ?? PREFIJO_PAIS_POR_DEFECTO;
  }
}
