import type {
  IProveedorWhatsapp,
  MensajeWhatsapp,
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
}
