import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Se lanza al crear o renombrar un deporte con un nombre que ya tiene otro
 * (sin mayúsculas ni tildes): dos «Fútbol» en el buscador no se distinguen.
 */
export class ErrorDeporteDuplicado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "CONFLICTO";

  constructor(nombre: string) {
    super(`Ya existe un deporte llamado «${nombre}».`);
  }
}
