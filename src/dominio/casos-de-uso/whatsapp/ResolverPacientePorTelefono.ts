import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "../../repositorios/IConfiguracionRepositorio";
import type { Paciente } from "../../entidades/Paciente";
import { ConfiguracionConsultorio } from "../../entidades/ConfiguracionConsultorio";
import {
  normalizarTelefonoE164,
  PREFIJO_PAIS_POR_DEFECTO,
} from "../../servicios/telefono";

/**
 * Caso de uso: encontrar al paciente del inquilino dueño de un número.
 *
 * Es el filtro del que depende toda la ingesta: si un número no corresponde a
 * un paciente registrado, el mensaje se descarta y nunca se persiste. Así el
 * WhatsApp personal del profesional —familia, amigos, otros contactos— no
 * entra a la app aunque comparta el número con el consultorio.
 *
 * La comparación es sobre el E.164 normalizado y no sobre el texto guardado,
 * porque `Paciente.telefono` es texto libre: el mismo número puede estar
 * cargado como "011 15 5555-4444" y llegar de Meta como "5491155554444".
 *
 * Esa forma canónica ahora está PERSISTIDA en `Paciente.telefonoE164` con un
 * índice único por inquilino, así que esto es un lookup y no —como antes— un
 * barrido de toda la tabla de pacientes por cada mensaje entrante.
 */
export class ResolverPacientePorTelefono {
  constructor(
    private readonly pacientes: IPacienteRepositorio,
    private readonly configuracion: IConfiguracionRepositorio,
  ) {}

  async ejecutar(telefono: string): Promise<Paciente | null> {
    const config =
      (await this.configuracion.obtener()) ??
      ConfiguracionConsultorio.porDefecto();
    const prefijo = config.whatsappPrefijoPais ?? PREFIJO_PAIS_POR_DEFECTO;

    const buscado = this.normalizar(telefono, prefijo);
    if (!buscado) return null;

    return this.pacientes.obtenerPorTelefonoE164(buscado);
  }

  /** Normaliza sin propagar el error: un teléfono ilegible simplemente no matchea. */
  private normalizar(telefono: string | null, prefijo: string): string | null {
    try {
      return normalizarTelefonoE164(telefono, prefijo);
    } catch {
      return null;
    }
  }
}
