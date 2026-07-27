import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca una plantilla de email que no existe. */
export class ErrorPlantillaNoEncontrada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(referencia: string) {
    super(`No se encontró la plantilla de email «${referencia}».`);
  }
}
