import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Se lanza al registrar una bioimpedancia en una fecha en la que el paciente
 * ya tiene otra (una medición por consulta/fecha).
 */
export class ErrorBioimpedanciaDuplicada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "CONFLICTO";

  constructor(fecha: Date) {
    const dia = fecha.toISOString().slice(0, 10);
    super(`El paciente ya tiene una bioimpedancia registrada el ${dia}.`);
  }
}
