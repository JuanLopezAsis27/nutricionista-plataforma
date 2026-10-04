import type { IGrupoMaterialRepositorio } from "@/dominio/repositorios/IGrupoMaterialRepositorio";
import type {
  GrupoMaterial,
  DatosGrupoMaterial,
} from "@/dominio/entidades/GrupoMaterial";
import { ErrorGrupoMaterialNoEncontrado } from "@/dominio/errores/ErrorGrupoMaterialNoEncontrado";
import { ErrorGrupoMaterialDuplicado } from "@/dominio/errores/ErrorGrupoMaterialDuplicado";

/** Entrada: id de la carpeta + sus datos. */
export interface DatosActualizarGrupoMaterial extends DatosGrupoMaterial {
  id: string;
}

/** Caso de uso: renombrar o redescribir una carpeta de la biblioteca. */
export class ActualizarGrupoMaterial {
  constructor(private readonly grupos: IGrupoMaterialRepositorio) {}

  async ejecutar(datos: DatosActualizarGrupoMaterial): Promise<GrupoMaterial> {
    const existente = await this.grupos.obtenerPorId(datos.id);
    if (!existente) {
      throw new ErrorGrupoMaterialNoEncontrado(datos.id);
    }
    const actualizado = existente.actualizar(datos);
    // `excluirId` la deja guardar sin renombrarse: sin eso, editar la
    // descripción chocaría contra su propio nombre.
    if (await this.grupos.existeNombre(actualizado.nombre, actualizado.id)) {
      throw new ErrorGrupoMaterialDuplicado(actualizado.nombre);
    }
    return this.grupos.actualizar(actualizado);
  }
}
