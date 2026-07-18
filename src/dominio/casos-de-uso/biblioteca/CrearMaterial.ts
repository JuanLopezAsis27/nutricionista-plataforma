import type { IMaterialRepositorio } from "../../repositorios/IMaterialRepositorio";
import {
  MaterialBiblioteca,
  type DatosNuevoMaterial,
} from "../../entidades/MaterialBiblioteca";
import { ErrorValidacion } from "../../errores/ErrorValidacion";

/** Datos de entrada: el material + id del archivo ya subido (tipo ARCHIVO). */
export interface DatosCrearMaterial extends DatosNuevoMaterial {
  archivoId?: string | null;
}

/**
 * Caso de uso: crear un material de la biblioteca.
 * Tipo ARCHIVO exige un archivo ya subido al bucket (se vincula acá);
 * tipo ENLACE exige URL (la valida la entidad).
 */
export class CrearMaterial {
  constructor(private readonly materiales: IMaterialRepositorio) {}

  async ejecutar(datos: DatosCrearMaterial): Promise<MaterialBiblioteca> {
    if (datos.tipo === "ARCHIVO" && !datos.archivoId?.trim()) {
      throw new ErrorValidacion("El material de tipo archivo necesita un archivo subido.");
    }
    const material = MaterialBiblioteca.crear(datos, crypto.randomUUID());
    return this.materiales.crear(
      material,
      datos.tipo === "ARCHIVO" ? datos.archivoId : null,
    );
  }
}
