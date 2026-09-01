import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza al operar sobre una grabación de consulta que no existe. */
export class ErrorGrabacionNoEncontrada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(id: string) {
    super(`No se encontró la grabación ${id}.`);
  }
}
