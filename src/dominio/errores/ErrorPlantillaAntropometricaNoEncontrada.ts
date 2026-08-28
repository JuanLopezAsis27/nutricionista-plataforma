import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca una plantilla de medición que no existe. */
export class ErrorPlantillaAntropometricaNoEncontrada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(idPlantilla: string) {
    super(`No se encontró la plantilla de medición con id «${idPlantilla}».`);
  }
}
