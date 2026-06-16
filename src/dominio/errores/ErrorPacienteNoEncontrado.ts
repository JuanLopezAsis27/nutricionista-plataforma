import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/** Se lanza cuando se busca un paciente que no existe. */
export class ErrorPacienteNoEncontrado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(idPaciente: string) {
    super(`No se encontró el paciente con id «${idPaciente}».`);
  }
}
