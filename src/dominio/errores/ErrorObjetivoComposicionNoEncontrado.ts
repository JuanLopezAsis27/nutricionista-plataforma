import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca un objetivo de composición corporal que no existe. */
export class ErrorObjetivoComposicionNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(idObjetivo: string) {
    super(`No se encontró el objetivo de composición con id «${idObjetivo}».`);
  }
}
