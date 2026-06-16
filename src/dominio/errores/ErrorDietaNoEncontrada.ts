import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca una dieta que no existe. */
export class ErrorDietaNoEncontrada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(idDieta: string) {
    super(`No se encontró la dieta con id «${idDieta}».`);
  }
}
