import type { IDietaRepositorio } from "../../repositorios/IDietaRepositorio";
import { Dieta, type DatosNuevaDieta } from "../../entidades/Dieta";
import { ErrorDietaNoEncontrada } from "../../errores/ErrorDietaNoEncontrada";

/** Entrada del dominio: id de la dieta + nuevos datos completos. */
export interface DatosActualizarDieta extends DatosNuevaDieta {
  id: string;
}

/**
 * Caso de uso: actualizar una dieta (nombre, descripción y comidas).
 *
 * Verifica que exista, revalida con Dieta.crear preservando el id y el
 * creadoEn originales (se regeneran los ids de las comidas), y persiste.
 */
export class ActualizarDieta {
  constructor(private readonly dietas: IDietaRepositorio) {}

  async ejecutar(datos: DatosActualizarDieta): Promise<Dieta> {
    const { id, ...nuevosDatos } = datos;

    const existente = await this.dietas.obtenerPorId(id);
    if (!existente) {
      throw new ErrorDietaNoEncontrada(id);
    }

    // Reutiliza la validación de la entidad preservando id y creadoEn.
    const actualizada = Dieta.crear(
      nuevosDatos,
      existente.id,
      () => crypto.randomUUID(),
      existente.creadoEn,
    );

    return this.dietas.actualizar(actualizada);
  }
}
