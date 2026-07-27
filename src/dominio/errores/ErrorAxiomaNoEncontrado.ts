import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca un axioma que no existe. */
export class ErrorAxiomaNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(referencia: string) {
    super(`No se encontró el axioma «${referencia}».`);
  }
}
