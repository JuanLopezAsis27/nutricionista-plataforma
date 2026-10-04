import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza al operar sobre una carpeta de la biblioteca que no existe. */
export class ErrorGrupoMaterialNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(id: string) {
    super(`No se encontró la carpeta de la biblioteca ${id}.`);
  }
}
