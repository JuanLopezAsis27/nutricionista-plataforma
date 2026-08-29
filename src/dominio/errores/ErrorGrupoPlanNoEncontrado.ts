import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza al operar sobre una carpeta de planes que no existe. */
export class ErrorGrupoPlanNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(id: string) {
    super(`No se encontró la carpeta de planes ${id}.`);
  }
}
