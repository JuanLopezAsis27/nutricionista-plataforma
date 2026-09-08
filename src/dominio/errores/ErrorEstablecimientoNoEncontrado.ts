import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca un establecimiento que no existe. */
export class ErrorEstablecimientoNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(idEstablecimiento: string) {
    super(`No se encontró el establecimiento con id «${idEstablecimiento}».`);
  }
}
