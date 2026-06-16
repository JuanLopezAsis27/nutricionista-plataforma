import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Se lanza al intentar agendar un turno que se solapa con otro existente.
 * Regla de negocio: no pueden existir dos turnos en el mismo horario.
 */
export class ErrorTurnoConflicto extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "CONFLICTO";

  constructor(fecha: string, hora: string) {
    super(`Ya existe un turno agendado para el ${fecha} a las ${hora}.`);
  }
}
