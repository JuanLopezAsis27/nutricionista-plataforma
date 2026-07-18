import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca un objetivo que no existe. */
export class ErrorObjetivoNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(idObjetivo: string) {
    super(`No se encontró el objetivo con id «${idObjetivo}».`);
  }
}
