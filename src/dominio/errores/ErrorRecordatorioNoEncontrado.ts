import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se confirma un recordatorio de WhatsApp que no existe. */
export class ErrorRecordatorioNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(idRecordatorio: string) {
    super(`No se encontró el recordatorio con id «${idRecordatorio}».`);
  }
}
