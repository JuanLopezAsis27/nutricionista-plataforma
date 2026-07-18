import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca un material de la biblioteca que no existe. */
export class ErrorMaterialNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(idMaterial: string) {
    super(`No se encontró el material con id «${idMaterial}».`);
  }
}
