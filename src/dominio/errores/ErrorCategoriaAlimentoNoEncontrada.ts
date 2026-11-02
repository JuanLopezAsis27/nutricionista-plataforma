import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Se lanza al operar sobre una categoría de alimento que no existe, o que no
 * es de las que este consultorio puede tocar (una predeterminada no se edita
 * desde un consultorio).
 */
export class ErrorCategoriaAlimentoNoEncontrada extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "NO_ENCONTRADO";

  constructor(id: string) {
    super(`No se encontró la categoría de alimento ${id}.`);
  }
}
