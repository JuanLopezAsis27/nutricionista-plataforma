import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca un usuario que no existe. */
export class ErrorUsuarioNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(identificador: string) {
    super(`No se encontró el usuario «${identificador}».`);
  }
}
