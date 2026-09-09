import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se edita o borra un campo personalizado que no existe. */
export class ErrorCampoHistoriaClinicaNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(idCampo: string) {
    super(
      `No se encontró el campo personalizado de historia clínica con id «${idCampo}».`,
    );
  }
}
