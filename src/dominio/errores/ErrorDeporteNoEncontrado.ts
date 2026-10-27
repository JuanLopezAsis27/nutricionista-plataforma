import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza al operar sobre un deporte que no está en la lista de la plataforma. */
export class ErrorDeporteNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(id: string) {
    super(`No se encontró el deporte ${id}.`);
  }
}
