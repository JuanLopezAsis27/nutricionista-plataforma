import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Se lanza al crear o renombrar un plan semanal con un nombre ya en uso.
 *
 * Mismo motivo que en los planes: el nombre es lo único que se ve al elegir
 * uno para asignar, y dos llamados igual son indistinguibles ahí.
 */
export class ErrorPlanSemanalDuplicado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "CONFLICTO";

  constructor(nombre: string) {
    super(`Ya existe un plan semanal llamado «${nombre}».`);
  }
}
