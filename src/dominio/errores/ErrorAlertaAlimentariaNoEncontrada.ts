import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca una alerta alimentaria que no existe. */
export class ErrorAlertaAlimentariaNoEncontrada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(id: string) {
    super(`No existe una alerta alimentaria con id ${id}.`);
  }
}
