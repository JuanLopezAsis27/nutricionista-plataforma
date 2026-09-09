import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca un plan semanal que no existe. */
export class ErrorPlanSemanalNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(idPlan: string) {
    super(`No se encontró el plan semanal con id «${idPlan}».`);
  }
}
