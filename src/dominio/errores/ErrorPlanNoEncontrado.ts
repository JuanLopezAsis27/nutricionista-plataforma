import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca un plan nutricional que no existe. */
export class ErrorPlanNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(idPlan: string) {
    super(`No se encontró el plan nutricional con id «${idPlan}».`);
  }
}
