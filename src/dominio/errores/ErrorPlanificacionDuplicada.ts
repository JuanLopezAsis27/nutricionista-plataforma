import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Se lanza al crear o renombrar una planificación deportiva con un nombre ya
 * en uso. Mismo motivo que en los planes: el nombre es lo único que se ve al
 * elegir una para asignar, y dos llamadas igual son indistinguibles ahí.
 */
export class ErrorPlanificacionDuplicada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "CONFLICTO";

  constructor(nombre: string) {
    super(`Ya existe una planificación llamada «${nombre}».`);
  }
}
