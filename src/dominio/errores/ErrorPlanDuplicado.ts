import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Se lanza al crear o renombrar un plan con un nombre que ya está en uso.
 *
 * El nombre es lo único que se ve al elegir un plan para asignar: dos planes
 * llamados igual son indistinguibles ahí. Planes y plantillas son espacios
 * separados, por eso el mensaje aclara de cuál se trata.
 */
export class ErrorPlanDuplicado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "CONFLICTO";

  constructor(nombre: string, esPlantilla: boolean) {
    super(
      esPlantilla
        ? `Ya existe una plantilla llamada «${nombre}».`
        : `Ya existe un plan llamado «${nombre}».`,
    );
  }
}
