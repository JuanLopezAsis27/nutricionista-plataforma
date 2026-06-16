import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Se lanza cuando se viola un invariante de una entidad
 * (p. ej. crear un Paciente sin nombre o con email inválido).
 */
export class ErrorValidacion extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "VALIDACION";

  constructor(mensaje: string) {
    super(mensaje);
  }
}
