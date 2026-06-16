import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Se lanza cuando un usuario autenticado intenta una acción para la que
 * no tiene permisos (p. ej. un PACIENTE accediendo a recursos de otro
 * paciente o a funciones exclusivas del NUTRICIONISTA).
 */
export class ErrorAccesoDenegado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "ACCESO_DENEGADO";

  constructor(mensaje = "No tenés permisos para realizar esta acción.") {
    super(mensaje);
  }
}
