import type { IBioimpedanciaRepositorio } from "@/dominio/repositorios/IBioimpedanciaRepositorio";
import type {
  Bioimpedancia,
  CambiosBioimpedancia,
} from "@/dominio/entidades/Bioimpedancia";
import { ErrorBioimpedanciaNoEncontrada } from "@/dominio/errores/ErrorBioimpedanciaNoEncontrada";
import { ErrorBioimpedanciaDuplicada } from "@/dominio/errores/ErrorBioimpedanciaDuplicada";

/**
 * Caso de uso: corregir una medición de bioimpedancia. Si se cambia la fecha,
 * mantiene la regla de una medición por fecha.
 */
export class ActualizarBioimpedancia {
  constructor(private readonly bioimpedancias: IBioimpedanciaRepositorio) {}

  async ejecutar(
    id: string,
    cambios: CambiosBioimpedancia,
  ): Promise<Bioimpedancia> {
    const existente = await this.bioimpedancias.obtenerPorId(id);
    if (!existente) {
      throw new ErrorBioimpedanciaNoEncontrada(id);
    }

    const actualizada = existente.actualizar(cambios);

    if (cambios.fecha) {
      const duplicada = await this.bioimpedancias.existeEnFecha(
        existente.pacienteId,
        actualizada.fecha,
        id,
      );
      if (duplicada) {
        throw new ErrorBioimpedanciaDuplicada(actualizada.fecha);
      }
    }

    return this.bioimpedancias.actualizar(actualizada);
  }
}
