import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { Paciente } from "@/dominio/entidades/Paciente";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import {
  normalizarTelefonoE164,
  PREFIJO_PAIS_POR_DEFECTO,
} from "@/dominio/servicios/telefono";
import { elegirFichaDelTelefono } from "@/dominio/servicios/fichaPorTelefono";

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
 * Esa forma canónica está PERSISTIDA en `Paciente.telefonoE164`, con índice.
 *
 * **Un número puede ser de varias fichas** (migración 81): dos hermanos con el
 * teléfono de la madre. Entonces se elige con pistas —el turno del botón, con
 * quién venía la conversación— según `elegirFichaDelTelefono`, y las pistas
 * solo se buscan en ese caso: con una sola ficha no cuestan nada.
 */
export class ResolverPacientePorTelefono {
  constructor(
    private readonly pacientes: IPacienteRepositorio,
    private readonly configuracion: IConfiguracionRepositorio,
    private readonly mensajes: IMensajeWhatsappRepositorio,
    private readonly turnos: ITurnoRepositorio,
  ) {}

  async ejecutar(
    telefono: string,
    /** El turno que nombra el botón tocado, si el mensaje es un botón. */
    turnoDelBoton: string | null = null,
  ): Promise<Paciente | null> {
    const config =
      (await this.configuracion.obtener()) ??
      ConfiguracionConsultorio.porDefecto();
    const prefijo = config.whatsappPrefijoPais ?? PREFIJO_PAIS_POR_DEFECTO;

    const buscado = this.normalizar(telefono, prefijo);
    if (!buscado) return null;

    const candidatas = await this.pacientes.listarPorTelefonoE164(buscado);
    if (candidatas.length <= 1) return candidatas[0] ?? null;

    const turno = turnoDelBoton
      ? await this.turnos.obtenerPorId(turnoDelBoton)
      : null;
    const ultimoSaliente = turno
      ? null
      : await this.mensajes.ultimoSalienteAlTelefono(buscado);
    return elegirFichaDelTelefono(candidatas, {
      pacienteDelTurno: turno?.pacienteId ?? null,
      pacienteDelUltimoSaliente: ultimoSaliente?.pacienteId ?? null,
    });
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
