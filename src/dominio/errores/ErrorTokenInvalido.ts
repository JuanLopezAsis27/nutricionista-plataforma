import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Se lanza cuando un token de recuperación es inválido, ya fue usado o venció.
 * El mensaje es deliberadamente genérico (no distingue el motivo) para no dar
 * pistas a un atacante.
 */
export class ErrorTokenInvalido extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "VALIDACION";

  constructor() {
    super(
      "El enlace de recuperación no es válido o expiró. Solicitá uno nuevo.",
    );
  }
}
