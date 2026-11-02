import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Se lanza al crear o renombrar una categoría de alimento con un nombre que
 * ya usa otra de las que ve el consultorio (sin mayúsculas ni tildes): dos
 * filtros «Geles» en el buscador no se pueden distinguir.
 */
export class ErrorCategoriaAlimentoDuplicada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "CONFLICTO";

  constructor(nombre: string, predeterminada = false) {
    super(
      predeterminada
        ? `«${nombre}» ya es una categoría predeterminada: usá esa.`
        : `Ya existe una categoría llamada «${nombre}».`,
    );
  }
}
