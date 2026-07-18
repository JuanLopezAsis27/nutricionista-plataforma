import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Se lanza al registrar una medición antropométrica en una fecha en la que
 * el paciente ya tiene otra (una medición por consulta/fecha).
 */
export class ErrorAntropometriaDuplicada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "CONFLICTO";

  constructor(fecha: Date) {
    const dia = fecha.toISOString().slice(0, 10);
    super(`El paciente ya tiene una medición registrada el ${dia}.`);
  }
}
