import type { ITurnoRepositorio } from "../../repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "../../repositorios/IConfiguracionRepositorio";
import type { IProveedorWhatsapp } from "../../servicios/IProveedorWhatsapp";
import { ConfiguracionConsultorio } from "../../entidades/ConfiguracionConsultorio";
import { ErrorTurnoNoEncontrado } from "../../errores/ErrorTurnoNoEncontrado";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import { armarRecordatorio } from "./armado";

/** Lo que ve el profesional antes de abrir WhatsApp. */
export interface VistaPreviaRecordatorio {
  turnoId: string;
  pacienteId: string;
  nombrePaciente: string;
  telefono: string;
  mensaje: string;
  /** Enlace wa.me listo para abrir (null si el proveedor envía por API). */
  enlace: string | null;
  modo: "ENLACE" | "API";
}

/**
 * Caso de uso: armar la vista previa del recordatorio de un turno sin escribir
 * nada. Alimenta el diálogo, donde el profesional puede retocar el texto antes
 * de abrir el chat.
 */
export class ObtenerVistaPreviaRecordatorio {
  constructor(
    private readonly turnos: ITurnoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly configuracion: IConfiguracionRepositorio,
    private readonly proveedor: IProveedorWhatsapp,
  ) {}

  async ejecutar(turnoId: string): Promise<VistaPreviaRecordatorio> {
    const turno = await this.turnos.obtenerPorId(turnoId);
    if (!turno) {
      throw new ErrorTurnoNoEncontrado(turnoId);
    }
    const paciente = await this.pacientes.obtenerPorId(turno.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(turno.pacienteId);
    }
    const config =
      (await this.configuracion.obtener()) ?? ConfiguracionConsultorio.porDefecto();

    const { nombrePaciente, telefono, mensaje } = armarRecordatorio(turno, paciente, config);
    const resultado = await this.proveedor.preparar({ telefono, texto: mensaje });

    return {
      turnoId: turno.id,
      pacienteId: paciente.id,
      nombrePaciente,
      telefono,
      mensaje,
      enlace: resultado.enlace ?? null,
      modo: resultado.modo,
    };
  }
}
