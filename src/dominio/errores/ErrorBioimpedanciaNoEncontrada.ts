import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca una medición de bioimpedancia que no existe. */
export class ErrorBioimpedanciaNoEncontrada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(id: string) {
    super(`No existe una medición de bioimpedancia con id ${id}.`);
  }
}
