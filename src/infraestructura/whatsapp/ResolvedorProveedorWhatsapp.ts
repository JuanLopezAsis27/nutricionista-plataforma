import type { ICredencialesIntegracionRepositorio } from "@/dominio/repositorios/ICredencialesIntegracionRepositorio";
import type {
  IProveedorWhatsapp,
  MensajeWhatsapp,
  ResultadoEnvioWhatsapp,
} from "@/dominio/servicios/IProveedorWhatsapp";
import { ProveedorWhatsappCloudApi } from "./ProveedorWhatsappCloudApi";
import { ProveedorWhatsappEnlace } from "./ProveedorWhatsappEnlace";
import { obtenerConfigWhatsapp } from "./configWhatsapp";

/**
 * Proveedor de WhatsApp resuelto POR REQUEST: usa las credenciales que cargó
 * el profesional (cifradas por inquilino), cae a las del entorno y, si no hay
 * ninguna, degrada al enlace wa.me.
 *
 * Que la resolución viva detrás del mismo puerto es lo que permite que la app
 * funcione igual con o sin la API oficial: el resto del código no se entera de
 * cuál de los dos está atendiendo.
 */
export class ResolvedorProveedorWhatsapp implements IProveedorWhatsapp {
  private readonly cache = new Map<string, ProveedorWhatsappCloudApi>();
  private readonly enlace = new ProveedorWhatsappEnlace();

  constructor(private readonly credenciales: ICredencialesIntegracionRepositorio) {}

  async modoActual(): Promise<"ENLACE" | "API"> {
    return (await this.resolver()) ? "API" : "ENLACE";
  }

  async preparar(mensaje: MensajeWhatsapp): Promise<ResultadoEnvioWhatsapp> {
    const proveedor = await this.resolver();
    return (proveedor ?? this.enlace).preparar(mensaje);
  }

  private async resolver(): Promise<ProveedorWhatsappCloudApi | null> {
    const config = await this.credencialesDelInquilino();
    if (!config) return null;

    const clave = `${config.phoneNumberId}:${config.token}`;
    let proveedor = this.cache.get(clave);
    if (!proveedor) {
      proveedor = new ProveedorWhatsappCloudApi(config.token, config.phoneNumberId);
      this.cache.set(clave, proveedor);
    }
    return proveedor;
  }

  private async credencialesDelInquilino(): Promise<{
    token: string;
    phoneNumberId: string;
  } | null> {
    try {
      const c = await this.credenciales.obtener();
      if (c?.whatsappToken && c.whatsappPhoneNumberId) {
        return { token: c.whatsappToken, phoneNumberId: c.whatsappPhoneNumberId };
      }
    } catch {
      // Sin alcance de inquilino o error de lectura → probamos el entorno.
    }
    const env = obtenerConfigWhatsapp();
    return env ? { token: env.token, phoneNumberId: env.phoneNumberId } : null;
  }
}
