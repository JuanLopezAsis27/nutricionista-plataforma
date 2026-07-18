import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca un registro del diario (o un hijo) que no existe. */
export class ErrorRegistroDiarioNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(detalle: string) {
    super(`No existe ${detalle}.`);
  }
}
