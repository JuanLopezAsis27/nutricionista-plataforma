import type { ITurnoRepositorio } from "../../repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "../../repositorios/IConfiguracionRepositorio";
import type { IRecordatorioWhatsappRepositorio } from "../../repositorios/IRecordatorioWhatsappRepositorio";
import type { IProveedorWhatsapp } from "../../servicios/IProveedorWhatsapp";
import { ConfiguracionConsultorio } from "../../entidades/ConfiguracionConsultorio";
import { RecordatorioWhatsapp } from "../../entidades/RecordatorioWhatsapp";
import { ErrorTurnoNoEncontrado } from "../../errores/ErrorTurnoNoEncontrado";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import { armarRecordatorio } from "./armado";

/** Datos con los que el profesional dispara la apertura de WhatsApp. */
export interface DatosPreparacion {
  turnoId: string;
  usuarioId: string;
  /** Texto final si lo editó en el diálogo; si falta se usa la plantilla. */
  mensaje?: string | null;
}

/** Lo que necesita el cliente para abrir el chat y luego confirmar el envío. */
export interface RecordatorioPreparado {
  recordatorioId: string;
  telefono: string;
  mensaje: string;
  /** Enlace wa.me a abrir; null cuando el mensaje ya salió por la API. */
  enlace: string | null;
  modo: "ENLACE" | "API";
}

/**
 * Caso de uso: dejar registrado que se abrió WhatsApp con el recordatorio de
 * un turno.
 *
 * Registra la fila en estado PREPARADO, que significa "se abrió el chat" y
 * nunca "se envió" (el enlace wa.me no devuelve nada a la app): queda a la
 * espera de que el profesional confirme el envío.
 */
export class PrepararRecordatorioWhatsapp {
  constructor(
    private readonly turnos: ITurnoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly configuracion: IConfiguracionRepositorio,
    private readonly recordatorios: IRecordatorioWhatsappRepositorio,
    private readonly proveedor: IProveedorWhatsapp,
  ) {}

  async ejecutar(datos: DatosPreparacion): Promise<RecordatorioPreparado> {
    const turno = await this.turnos.obtenerPorId(datos.turnoId);
    if (!turno) {
      throw new ErrorTurnoNoEncontrado(datos.turnoId);
    }
    const paciente = await this.pacientes.obtenerPorId(turno.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(turno.pacienteId);
    }
    const config =
      (await this.configuracion.obtener()) ?? ConfiguracionConsultorio.porDefecto();

    // El teléfono nunca se toma del cliente: sale del paciente y se normaliza acá.
    const armado = armarRecordatorio(turno, paciente, config);
    const mensaje = datos.mensaje?.trim() || armado.mensaje;
    if (mensaje.length === 0) {
      throw new ErrorValidacion("El mensaje del recordatorio no puede estar vacío.");
    }

    const resultado = await this.proveedor.preparar({
      telefono: armado.telefono,
      texto: mensaje,
    });

    const recordatorio = await this.recordatorios.registrar(
      RecordatorioWhatsapp.crear(
        {
          turnoId: turno.id,
          pacienteId: paciente.id,
          telefono: armado.telefono,
          mensaje,
          usuarioId: datos.usuarioId,
          // Con la API oficial el mensaje ya salió: el wamid deja que el
          // webhook de entrega confirme el recordatorio sin intervención.
          idExterno: resultado.idExterno,
        },
        crypto.randomUUID(),
      ),
    );

    return {
      recordatorioId: recordatorio.id,
      telefono: armado.telefono,
      mensaje,
      enlace: resultado.enlace ?? null,
      modo: resultado.modo,
    };
  }
}
