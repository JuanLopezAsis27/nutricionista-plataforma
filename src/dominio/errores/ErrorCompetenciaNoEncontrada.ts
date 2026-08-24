import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca una competencia que no existe. */
export class ErrorCompetenciaNoEncontrada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(id: string) {
    super(`No se encontró la competencia «${id}».`);
  }
}
