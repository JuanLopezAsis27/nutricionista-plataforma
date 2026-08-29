import type { IMensajeWhatsappRepositorio } from "../../repositorios/IMensajeWhatsappRepositorio";
import type { IRecordatorioWhatsappRepositorio } from "../../repositorios/IRecordatorioWhatsappRepositorio";
import type { EstadoMensajeWhatsapp } from "../../entidades/MensajeWhatsapp";

/** Estado de entrega que informa el webhook para un wamid concreto. */
export interface EstadoEntregaWhatsapp {
  idExterno: string;
  estado: EstadoMensajeWhatsapp;
  /** Motivo cuando el estado es FALLIDO. */
  error?: string | null;
}

/**
 * Caso de uso: aplicar el estado de entrega que informó Meta.
 *
 * Cierra el círculo que la Fase A no podía cerrar: con la API oficial, que un
 * recordatorio se haya enviado deja de ser algo que el profesional declara y
 * pasa a confirmarlo el webhook.
 */
export class RegistrarEstadoWhatsapp {
  constructor(
    private readonly mensajes: IMensajeWhatsappRepositorio,
    private readonly recordatorios: IRecordatorioWhatsappRepositorio,
  ) {}

  async ejecutar(estados: EstadoEntregaWhatsapp[]): Promise<number> {
    let aplicados = 0;

    for (const informe of estados) {
      if (await this.aplicarAMensaje(informe)) aplicados += 1;
      if (await this.aplicarARecordatorio(informe)) aplicados += 1;
    }
    return aplicados;
  }

  private async aplicarAMensaje(
    informe: EstadoEntregaWhatsapp,
  ): Promise<boolean> {
    const mensaje = await this.mensajes.obtenerPorIdExterno(informe.idExterno);
    if (!mensaje) return false;

    const actualizado =
      informe.estado === "FALLIDO"
        ? mensaje.registrarFallo(
            informe.error ?? "El proveedor rechazó el mensaje.",
          )
        : mensaje.registrarEstado(informe.estado);

    // `registrarEstado` devuelve la misma instancia si el estado no avanza.
    if (actualizado === mensaje) return false;
    await this.mensajes.actualizar(actualizado);
    return true;
  }

  private async aplicarARecordatorio(
    informe: EstadoEntregaWhatsapp,
  ): Promise<boolean> {
    const recordatorio = await this.recordatorios.obtenerPorIdExterno(
      informe.idExterno,
    );
    if (!recordatorio) return false;

    // El recordatorio comparte la escala de entrega con el mensaje: ENVIADO →
    // ENTREGADO → LEIDO. Antes se aplanaba todo a "confirmado", y el
    // profesional no podía distinguir un aviso que Meta aceptó de uno que el
    // paciente efectivamente abrió.
    if (informe.estado === "PENDIENTE") return false;

    const actualizado =
      informe.estado === "FALLIDO"
        ? recordatorio.registrarFallo(
            informe.error ?? "El proveedor rechazó el mensaje.",
          )
        : recordatorio.registrarEstado(informe.estado);

    // `registrarEstado` devuelve la misma instancia si el estado no avanza.
    if (actualizado === recordatorio) return false;
    await this.recordatorios.actualizar(actualizado);
    return true;
  }
}
