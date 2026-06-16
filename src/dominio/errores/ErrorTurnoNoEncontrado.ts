import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca un turno que no existe. */
export class ErrorTurnoNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(idTurno: string) {
    super(`No se encontró el turno con id «${idTurno}».`);
  }
}
