import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza al operar sobre una planificación deportiva que no existe. */
export class ErrorPlanificacionNoEncontrada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(id: string) {
    super(`No se encontró la planificación deportiva ${id}.`);
  }
}
