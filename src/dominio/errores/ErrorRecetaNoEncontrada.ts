import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca una receta que no existe. */
export class ErrorRecetaNoEncontrada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(idReceta: string) {
    super(`No se encontró la receta con id «${idReceta}».`);
  }
}
