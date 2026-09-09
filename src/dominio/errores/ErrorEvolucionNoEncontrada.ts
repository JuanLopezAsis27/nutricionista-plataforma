import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se edita o borra una evolución que no existe. */
export class ErrorEvolucionNoEncontrada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(idEvolucion: string) {
    super(`No se encontró la evolución con id «${idEvolucion}».`);
  }
}
