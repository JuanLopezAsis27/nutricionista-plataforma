import { ErrorValidacion } from "./ErrorValidacion";

/**
 * Se lanza cuando un archivo no cumple las reglas de su contexto
 * (tipo MIME no permitido, tamaño excedido, nombre vacío).
 */
export class ErrorArchivoInvalido extends ErrorValidacion {
  constructor(mensaje: string) {
    super(mensaje);
  }
}
