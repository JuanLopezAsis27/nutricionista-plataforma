import type { IMaterialRepositorio } from "@/dominio/repositorios/IMaterialRepositorio";
import type { IGrupoMaterialRepositorio } from "@/dominio/repositorios/IGrupoMaterialRepositorio";
import { ErrorMaterialNoEncontrado } from "@/dominio/errores/ErrorMaterialNoEncontrado";
import { ErrorGrupoMaterialNoEncontrado } from "@/dominio/errores/ErrorGrupoMaterialNoEncontrado";

/** Entrada: qué material y a qué carpeta (null = sacarlo de la que esté). */
export interface DatosMoverMaterial {
  materialId: string;
  grupoId: string | null;
}

/**
 * Caso de uso: mover un material a una carpeta, o sacarlo de la que esté.
 *
 * Existe aparte de `ActualizarMaterial` por lo mismo que `MoverRecetaAGrupo`:
 * ordenar no es editar. Acá se toca `grupoId` y nada más.
 */
export class MoverMaterialAGrupo {
  constructor(
    private readonly materiales: IMaterialRepositorio,
    private readonly grupos: IGrupoMaterialRepositorio,
  ) {}

  async ejecutar(datos: DatosMoverMaterial): Promise<void> {
    const material = await this.materiales.obtenerPorId(datos.materialId);
    if (!material) {
      throw new ErrorMaterialNoEncontrado(datos.materialId);
    }

    // Se comprueba la carpeta antes de escribir: la FK la rechazaría igual,
    // pero como error de base y no como "esa carpeta no existe".
    if (
      datos.grupoId !== null &&
      !(await this.grupos.obtenerPorId(datos.grupoId))
    ) {
      throw new ErrorGrupoMaterialNoEncontrado(datos.grupoId);
    }

    await this.materiales.moverAGrupo(datos.materialId, datos.grupoId);
  }
}
