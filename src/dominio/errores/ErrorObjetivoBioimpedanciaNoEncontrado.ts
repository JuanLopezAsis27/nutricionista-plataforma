import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca un objetivo de bioimpedancia que no existe. */
export class ErrorObjetivoBioimpedanciaNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(idObjetivo: string) {
    super(
      `No se encontró el objetivo de bioimpedancia con id «${idObjetivo}».`,
    );
  }
}
