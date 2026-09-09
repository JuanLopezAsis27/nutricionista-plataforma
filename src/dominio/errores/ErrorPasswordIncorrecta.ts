import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Se lanza cuando alguien intenta cambiar su contraseña y la ACTUAL que
 * escribió no coincide con la guardada.
 *
 * El código es VALIDACION y no ACCESO_DENEGADO a propósito: quien pide el
 * cambio ya está autenticado y no le falta ningún permiso —se equivocó al
 * tipear un campo del formulario—. Traducirlo a un 403 haría que la UI lo
 * tratara como "esta acción no es para vos" en vez de como el error de campo
 * que es.
 */
export class ErrorPasswordIncorrecta extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "VALIDACION";

  constructor() {
    super("La contraseña actual no es correcta.");
  }
}
