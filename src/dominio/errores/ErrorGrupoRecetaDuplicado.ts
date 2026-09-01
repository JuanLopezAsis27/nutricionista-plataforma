import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza al crear o renombrar una carpeta con un nombre ya en uso. */
export class ErrorGrupoRecetaDuplicado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "CONFLICTO";

  constructor(nombre: string) {
    super(`Ya existe una carpeta de recetas llamada «${nombre}».`);
  }
}
