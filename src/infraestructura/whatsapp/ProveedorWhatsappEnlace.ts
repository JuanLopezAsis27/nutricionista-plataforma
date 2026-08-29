import type {
  IProveedorWhatsapp,
  MensajeWhatsapp,
  PlantillaWhatsappEnvio,
  ResultadoEnvioWhatsapp,
} from "@/dominio/servicios/IProveedorWhatsapp";
import { construirEnlaceWhatsapp } from "@/dominio/casos-de-uso/whatsapp/enlace";

/**
 * Proveedor por enlace: no envía nada, arma el wa.me para que el profesional
 * abra el chat y mande el mensaje a mano.
 *
 * Es la única opción hasta que haya un número dado de alta en la Cloud API de
 * Meta; entonces otra implementación de este mismo puerto enviará de verdad.
 */
export class ProveedorWhatsappEnlace implements IProveedorWhatsapp {
  async modoActual(): Promise<"ENLACE" | "API"> {
    return "ENLACE";
  }

  async preparar(mensaje: MensajeWhatsapp): Promise<ResultadoEnvioWhatsapp> {
    return {
      modo: "ENLACE",
      enlace: construirEnlaceWhatsapp(mensaje.telefono, mensaje.texto),
    };
  }

  /**
   * Por enlace no hay plantillas que aprobar: la ventana de 24 h y las
   * plantillas de Meta son restricciones de la API, y acá el mensaje lo manda
   * una persona desde su teléfono. Se usa el texto ya renderizado.
   */
  async enviarPlantilla(envio: PlantillaWhatsappEnvio): Promise<ResultadoEnvioWhatsapp> {
    return {
      modo: "ENLACE",
      enlace: construirEnlaceWhatsapp(envio.telefono, envio.textoEquivalente),
    };
  }
}
