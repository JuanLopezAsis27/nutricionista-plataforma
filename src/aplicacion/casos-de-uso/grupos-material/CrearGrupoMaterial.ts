import type { IGrupoMaterialRepositorio } from "@/dominio/repositorios/IGrupoMaterialRepositorio";
import {
  GrupoMaterial,
  type DatosGrupoMaterial,
} from "@/dominio/entidades/GrupoMaterial";
import { ErrorGrupoMaterialDuplicado } from "@/dominio/errores/ErrorGrupoMaterialDuplicado";

/** Caso de uso: crear una carpeta de la biblioteca. */
export class CrearGrupoMaterial {
  constructor(private readonly grupos: IGrupoMaterialRepositorio) {}

  async ejecutar(datos: DatosGrupoMaterial): Promise<GrupoMaterial> {
    const grupo = GrupoMaterial.crear(datos, crypto.randomUUID());
    // El índice único es la garantía dura; esto da el mensaje entendible.
    if (await this.grupos.existeNombre(grupo.nombre)) {
      throw new ErrorGrupoMaterialDuplicado(grupo.nombre);
    }
    return this.grupos.crear(grupo);
  }
}
