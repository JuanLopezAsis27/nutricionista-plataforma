import type { IDeporteRepositorio } from "@/dominio/repositorios/IDeporteRepositorio";
import type { Deporte } from "@/dominio/entidades/Deporte";
import { ErrorDeporteNoEncontrado } from "@/dominio/errores/ErrorDeporteNoEncontrado";
import { verificarNombreLibre } from "./CrearDeporte";

/**
 * Caso de uso: renombrar un deporte. Los perfiles lo llevan por id, así que
 * el nombre nuevo aparece en todos —de todos los consultorios— sin tocarlos.
 * Es lo que se hace con un deporte en uso que quedó mal escrito.
 */
export class RenombrarDeporte {
  constructor(private readonly deportes: IDeporteRepositorio) {}

  async ejecutar(id: string, nombre: string): Promise<Deporte> {
    const actual = await this.deportes.obtenerPorId(id);
    if (!actual) throw new ErrorDeporteNoEncontrado(id);
    const renombrado = actual.renombrar(nombre);
    await verificarNombreLibre(renombrado, this.deportes);
    return this.deportes.actualizar(renombrado);
  }
}
