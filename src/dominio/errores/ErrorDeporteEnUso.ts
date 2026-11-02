import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Se lanza al borrar un deporte que tiene algún perfil deportivo, de
 * cualquier consultorio. El perfil exige un deporte: borrarlo dejaría a esos
 * pacientes sin uno. Se renombra en vez de borrarse.
 */
export class ErrorDeporteEnUso extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "CONFLICTO";

  constructor(nombre: string, perfiles: number) {
    super(
      `No se puede eliminar «${nombre}»: lo ${perfiles === 1 ? "usa 1 perfil deportivo" : `usan ${perfiles} perfiles deportivos`}. Podés renombrarlo.`,
    );
  }
}
