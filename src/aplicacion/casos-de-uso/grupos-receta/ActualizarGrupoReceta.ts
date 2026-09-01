import type { IGrupoRecetaRepositorio } from "@/dominio/repositorios/IGrupoRecetaRepositorio";
import type {
  GrupoReceta,
  DatosGrupoReceta,
} from "@/dominio/entidades/GrupoReceta";
import { ErrorGrupoRecetaNoEncontrado } from "@/dominio/errores/ErrorGrupoRecetaNoEncontrado";
import { ErrorGrupoRecetaDuplicado } from "@/dominio/errores/ErrorGrupoRecetaDuplicado";

/** Entrada: id de la carpeta + sus datos. */
export interface DatosActualizarGrupoReceta extends DatosGrupoReceta {
  id: string;
}

/** Caso de uso: renombrar o redescribir una carpeta del recetario. */
export class ActualizarGrupoReceta {
  constructor(private readonly grupos: IGrupoRecetaRepositorio) {}

  async ejecutar(datos: DatosActualizarGrupoReceta): Promise<GrupoReceta> {
    const existente = await this.grupos.obtenerPorId(datos.id);
    if (!existente) {
      throw new ErrorGrupoRecetaNoEncontrado(datos.id);
    }
    const actualizado = existente.actualizar(datos);
    // `excluirId` la deja guardar sin renombrarse: sin eso, editar la
    // descripción chocaría contra su propio nombre.
    if (await this.grupos.existeNombre(actualizado.nombre, actualizado.id)) {
      throw new ErrorGrupoRecetaDuplicado(actualizado.nombre);
    }
    return this.grupos.actualizar(actualizado);
  }
}
