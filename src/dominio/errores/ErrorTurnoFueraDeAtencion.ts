import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Se lanza al intentar agendar o reprogramar un turno fuera de la agenda que
 * el consultorio declaró en Configuración: un día que no atiende, o un horario
 * que empieza antes de abrir / termina después de cerrar.
 *
 * Es "VALIDACION" y no "CONFLICTO": no choca con otro turno, contradice la
 * configuración del propio consultorio.
 */
export class ErrorTurnoFueraDeAtencion extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "VALIDACION";

  constructor(motivo: string) {
    super(motivo);
  }
}
