import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se edita o borra un campo de evolución que no existe. */
export class ErrorCampoEvolucionNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(idCampo: string) {
    super(
      `No se encontró el campo personalizado de evolución con id «${idCampo}».`,
    );
  }
}
