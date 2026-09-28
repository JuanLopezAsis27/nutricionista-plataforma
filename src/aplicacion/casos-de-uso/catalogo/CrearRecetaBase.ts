import type { IRecetaBaseRepositorio } from "@/dominio/repositorios/IRecetaBaseRepositorio";
import { Receta, type DatosNuevaReceta } from "@/dominio/entidades/Receta";

/** Lo que tiene una receta de la plataforma: sin carpeta ni origen. */
export type DatosRecetaBase = Omit<
  DatosNuevaReceta,
  "grupoId" | "recetaBaseId"
>;

/**
 * Caso de uso: el SUPERADMIN agrega una receta al catálogo de la plataforma.
 * Los macros por porción los calcula la entidad de sus ingredientes, igual que
 * en un recetario.
 */
export class CrearRecetaBase {
  constructor(private readonly recetas: IRecetaBaseRepositorio) {}

  ejecutar(datos: DatosRecetaBase): Promise<Receta> {
    return this.recetas.crear(Receta.crear(datos, crypto.randomUUID()));
  }
}
