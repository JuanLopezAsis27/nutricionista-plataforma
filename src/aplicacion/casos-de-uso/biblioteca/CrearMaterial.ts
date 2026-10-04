import type { IMaterialRepositorio } from "@/dominio/repositorios/IMaterialRepositorio";
import type { IGrupoMaterialRepositorio } from "@/dominio/repositorios/IGrupoMaterialRepositorio";
import {
  MaterialBiblioteca,
  type DatosNuevoMaterial,
} from "@/dominio/entidades/MaterialBiblioteca";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { ErrorGrupoMaterialNoEncontrado } from "@/dominio/errores/ErrorGrupoMaterialNoEncontrado";

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
  constructor(
    private readonly materiales: IMaterialRepositorio,
    private readonly grupos: IGrupoMaterialRepositorio,
  ) {}

  async ejecutar(datos: DatosCrearMaterial): Promise<MaterialBiblioteca> {
    if (datos.tipo === "ARCHIVO" && !datos.archivoId?.trim()) {
      throw new ErrorValidacion(
        "El material de tipo archivo necesita un archivo subido.",
      );
    }
    // Se comprueba la carpeta antes de escribir: la FK la rechazaría igual,
    // pero como error de base y no como "esa carpeta no existe".
    if (datos.grupoId && !(await this.grupos.obtenerPorId(datos.grupoId))) {
      throw new ErrorGrupoMaterialNoEncontrado(datos.grupoId);
    }
    const material = MaterialBiblioteca.crear(datos, crypto.randomUUID());
    return this.materiales.crear(
      material,
      datos.tipo === "ARCHIVO" ? datos.archivoId : null,
    );
  }
}
