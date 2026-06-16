import type { IDietaRepositorio } from "../../repositorios/IDietaRepositorio";
import { Dieta, type DatosNuevaDieta } from "../../entidades/Dieta";

/**
 * Caso de uso: crear una dieta con sus comidas.
 *
 * La validación "al menos una comida" (y nombre obligatorio, calorías no
 * negativas, etc.) vive en la entidad Dieta.crear. Aquí se generan los ids
 * (de la dieta y de cada comida) y se persiste.
 */
export class CrearDieta {
  constructor(private readonly dietas: IDietaRepositorio) {}

  async ejecutar(datos: DatosNuevaDieta): Promise<Dieta> {
    const dieta = Dieta.crear(datos, crypto.randomUUID(), () => crypto.randomUUID());
    return this.dietas.crear(dieta);
  }
}
