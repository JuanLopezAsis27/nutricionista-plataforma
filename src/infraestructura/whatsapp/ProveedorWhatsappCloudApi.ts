import type {
  IProveedorWhatsapp,
  MensajeWhatsapp,
  PlantillaWhatsappEnvio,
  ResultadoEnvioWhatsapp,
} from "@/dominio/servicios/IProveedorWhatsapp";

const VERSION_API = "v21.0";
const TIEMPO_LIMITE_MS = 15000;

interface RespuestaEnvio {
  messages?: Array<{ id?: string }>;
  error?: { message?: string; error_data?: { details?: string } };
}

/**
 * Proveedor con la Cloud API oficial de Meta: envía el mensaje de verdad y
 * devuelve el wamid, que es lo que después correlaciona los webhooks de
 * entrega (enviado/entregado/leído).
 *
 * Fuera de la ventana de 24 h desde el último mensaje del paciente, Meta
 * rechaza el texto libre y exige una plantilla aprobada; ese error se propaga
 * tal cual para que el profesional entienda por qué no salió.
 */
export class ProveedorWhatsappCloudApi implements IProveedorWhatsapp {
  constructor(
    private readonly token: string,
    private readonly phoneNumberId: string,
  ) {}

  async modoActual(): Promise<"ENLACE" | "API"> {
    return "API";
  }

  async preparar(mensaje: MensajeWhatsapp): Promise<ResultadoEnvioWhatsapp> {
    return this.enviar({
      to: mensaje.telefono,
      type: "text",
      text: { preview_url: false, body: mensaje.texto },
    });
  }

  /**
   * Envío por plantilla aprobada, que es lo único que Meta acepta fuera de la
   * ventana de 24 h. Los parámetros van en un componente `body` y POR
   * POSICIÓN: la API no los nombra, los numera ({{1}}, {{2}}…), así que el
   * orden del array ES el mapeo. Mandarlos en otro orden no falla: le llega al
   * paciente la fecha donde iba el nombre.
   */
  async enviarPlantilla(
    envio: PlantillaWhatsappEnvio,
  ): Promise<ResultadoEnvioWhatsapp> {
    return this.enviar({
      to: envio.telefono,
      type: "template",
      template: {
        name: envio.nombrePlantilla,
        language: { code: envio.idioma },
        ...(envio.parametros.length > 0
          ? {
              components: [
                {
                  type: "body",
                  parameters: envio.parametros.map((texto) => ({
                    type: "text",
                    text: texto,
                  })),
                },
              ],
            }
          : {}),
      },
    });
  }

  private async enviar(
    cuerpo: Record<string, unknown>,
  ): Promise<ResultadoEnvioWhatsapp> {
    const respuesta = await fetch(
      `https://graph.facebook.com/${VERSION_API}/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          ...cuerpo,
        }),
        signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
      },
    );

    const datos = (await respuesta.json().catch(() => ({}))) as RespuestaEnvio;
    if (!respuesta.ok || datos.error) {
      throw new Error(
        datos.error?.error_data?.details ??
          datos.error?.message ??
          `WhatsApp rechazó el envío (HTTP ${respuesta.status}).`,
      );
    }

    return { modo: "API", idExterno: datos.messages?.[0]?.id };
  }
}
