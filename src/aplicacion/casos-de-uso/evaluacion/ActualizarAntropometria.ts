import type { IAntropometriaRepositorio } from "@/dominio/repositorios/IAntropometriaRepositorio";
import type {
  Antropometria,
  DatosNuevaAntropometria,
} from "@/dominio/entidades/Antropometria";
import { ErrorAntropometriaNoEncontrada } from "@/dominio/errores/ErrorAntropometriaNoEncontrada";
import { ErrorAntropometriaDuplicada } from "@/dominio/errores/ErrorAntropometriaDuplicada";

/** Cambios aplicables a una medición existente. */
export type CambiosAntropometria = Partial<
  Omit<DatosNuevaAntropometria, "pacienteId">
>;

/**
 * Caso de uso: corregir una medición antropométrica existente.
 * Si se cambia la fecha, mantiene la regla de una medición por fecha.
 */
export class ActualizarAntropometria {
  constructor(private readonly antropometrias: IAntropometriaRepositorio) {}

  async ejecutar(
    id: string,
    cambios: CambiosAntropometria,
  ): Promise<Antropometria> {
    const existente = await this.antropometrias.obtenerPorId(id);
    if (!existente) {
      throw new ErrorAntropometriaNoEncontrada(id);
    }

    const actualizada = existente.actualizar(cambios);

    if (cambios.fecha) {
      const duplicada = await this.antropometrias.existeEnFecha(
        existente.pacienteId,
        actualizada.fecha,
        id,
      );
      if (duplicada) {
        throw new ErrorAntropometriaDuplicada(actualizada.fecha);
      }
    }

    return this.antropometrias.actualizar(actualizada);
  }
}
