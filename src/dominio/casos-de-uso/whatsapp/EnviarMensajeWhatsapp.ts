import type { IMensajeWhatsappRepositorio } from "../../repositorios/IMensajeWhatsappRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "../../repositorios/IConfiguracionRepositorio";
import type { IProveedorWhatsapp } from "../../servicios/IProveedorWhatsapp";
import { ConfiguracionConsultorio } from "../../entidades/ConfiguracionConsultorio";
import { MensajeWhatsapp } from "../../entidades/MensajeWhatsapp";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import {
  normalizarTelefonoE164,
  PREFIJO_PAIS_POR_DEFECTO,
} from "../../servicios/telefono";

/**
 * Caso de uso: escribirle a un paciente por WhatsApp desde la app.
 *
 * Solo tiene sentido con la API oficial conectada; con el enlace wa.me el
 * mensaje lo manda el profesional a mano y no hay nada que persistir, así que
 * se rechaza en vez de fingir un envío.
 */
export class EnviarMensajeWhatsapp {
  constructor(
    private readonly mensajes: IMensajeWhatsappRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly configuracion: IConfiguracionRepositorio,
    private readonly proveedor: IProveedorWhatsapp,
  ) {}

  async ejecutar(pacienteId: string, cuerpo: string): Promise<MensajeWhatsapp> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }
    const config =
      (await this.configuracion.obtener()) ??
      ConfiguracionConsultorio.porDefecto();
    const telefono = normalizarTelefonoE164(
      paciente.telefono,
      config.whatsappPrefijoPais ?? PREFIJO_PAIS_POR_DEFECTO,
    );

    const resultado = await this.proveedor.preparar({
      telefono,
      texto: cuerpo,
    });
    if (resultado.modo !== "API") {
      throw new ErrorValidacion(
        "WhatsApp no está conectado a la app. Usá el botón del turno para abrir el chat.",
      );
    }

    return this.mensajes.crear(
      MensajeWhatsapp.crear(
        {
          pacienteId: paciente.id,
          direccion: "SALIENTE",
          telefono,
          cuerpo,
          idExterno: resultado.idExterno,
          estado: "ENVIADO",
        },
        crypto.randomUUID(),
      ),
    );
  }
}
