import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca una conversación que no existe. */
export class ErrorConversacionNoEncontrada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(referencia: string) {
    super(`No se encontró la conversación «${referencia}».`);
  }
}
