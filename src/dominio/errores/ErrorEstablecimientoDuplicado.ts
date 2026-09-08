import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza al crear o renombrar una sede con un nombre ya en uso. */
export class ErrorEstablecimientoDuplicado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "CONFLICTO";

  constructor(nombre: string) {
    super(`Ya existe un establecimiento llamado «${nombre}».`);
  }
}
