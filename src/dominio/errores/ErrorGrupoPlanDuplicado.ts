import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza al crear o renombrar una carpeta con un nombre ya en uso. */
export class ErrorGrupoPlanDuplicado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "CONFLICTO";

  constructor(nombre: string) {
    super(`Ya existe una carpeta de planes llamada «${nombre}».`);
  }
}
