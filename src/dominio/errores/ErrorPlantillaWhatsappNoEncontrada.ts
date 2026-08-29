import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se pide una plantilla de recordatorio por WhatsApp que no existe. */
export class ErrorPlantillaWhatsappNoEncontrada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(referencia: string) {
    super(`No se encontró la plantilla de WhatsApp «${referencia}».`);
  }
}
