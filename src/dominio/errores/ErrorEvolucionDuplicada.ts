import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Se lanza al registrar una evolución en una fecha en la que el paciente ya
 * tiene otra (una evolución por consulta, como la medición).
 */
export class ErrorEvolucionDuplicada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "CONFLICTO";

  constructor(fecha: Date) {
    const dia = fecha.toISOString().slice(0, 10);
    super(`El paciente ya tiene una evolución registrada el ${dia}.`);
  }
}
