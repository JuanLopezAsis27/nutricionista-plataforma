import type { IMaterialRepositorio } from "../../repositorios/IMaterialRepositorio";
import type {
  MaterialBiblioteca,
  CambiosMaterial,
} from "../../entidades/MaterialBiblioteca";
import { ErrorMaterialNoEncontrado } from "../../errores/ErrorMaterialNoEncontrado";

/** Datos de entrada: id + cambios (el tipo y el archivo no se cambian). */
export interface DatosActualizarMaterial extends CambiosMaterial {
  id: string;
}

/** Caso de uso: actualizar los metadatos de un material. */
export class ActualizarMaterial {
  constructor(private readonly materiales: IMaterialRepositorio) {}

  async ejecutar(datos: DatosActualizarMaterial): Promise<MaterialBiblioteca> {
    const existente = await this.materiales.obtenerPorId(datos.id);
    if (!existente) {
      throw new ErrorMaterialNoEncontrado(datos.id);
    }
    const actualizado = existente.actualizar(datos);
    return this.materiales.actualizar(actualizado);
  }
}
