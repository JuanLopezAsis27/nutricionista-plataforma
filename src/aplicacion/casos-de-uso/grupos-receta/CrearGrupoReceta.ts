import type { IGrupoRecetaRepositorio } from "@/dominio/repositorios/IGrupoRecetaRepositorio";
import {
  GrupoReceta,
  type DatosGrupoReceta,
} from "@/dominio/entidades/GrupoReceta";
import { ErrorGrupoRecetaDuplicado } from "@/dominio/errores/ErrorGrupoRecetaDuplicado";

/** Caso de uso: crear una carpeta del recetario. */
export class CrearGrupoReceta {
  constructor(private readonly grupos: IGrupoRecetaRepositorio) {}

  async ejecutar(datos: DatosGrupoReceta): Promise<GrupoReceta> {
    const grupo = GrupoReceta.crear(datos, crypto.randomUUID());
    // El índice único es la garantía dura; esto da el mensaje entendible.
    if (await this.grupos.existeNombre(grupo.nombre)) {
      throw new ErrorGrupoRecetaDuplicado(grupo.nombre);
    }
    return this.grupos.crear(grupo);
  }
}
