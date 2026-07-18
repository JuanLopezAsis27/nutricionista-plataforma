import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca una alerta de seguimiento que no existe. */
export class ErrorAlertaSeguimientoNoEncontrada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(idAlerta: string) {
    super(`No se encontró la alerta de seguimiento con id «${idAlerta}».`);
  }
}
