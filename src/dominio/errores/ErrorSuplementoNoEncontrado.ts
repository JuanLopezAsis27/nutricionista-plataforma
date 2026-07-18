import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca un suplemento que no existe. */
export class ErrorSuplementoNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(idSuplemento: string) {
    super(`No se encontró el suplemento con id «${idSuplemento}».`);
  }
}
