import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { IGrupoRecetaRepositorio } from "@/dominio/repositorios/IGrupoRecetaRepositorio";
import { ErrorRecetaNoEncontrada } from "@/dominio/errores/ErrorRecetaNoEncontrada";
import { ErrorGrupoRecetaNoEncontrado } from "@/dominio/errores/ErrorGrupoRecetaNoEncontrado";

/** Entrada: qué receta y a qué carpeta (null = sacarla de la que esté). */
export interface DatosMoverReceta {
  recetaId: string;
  grupoId: string | null;
}

/**
 * Caso de uso: mover una receta a una carpeta, o sacarla de la que esté.
 *
 * Existe aparte de `ActualizarReceta` porque ordenar no es editar: pasar una
 * receta de carpeta por el editor completo obligaría a mandar sus ingredientes,
 * sus fotos y su preparación enteros para cambiar un solo campo, y cualquier
 * fallo a mitad de camino reescribiría la receta. Acá se toca `grupoId` y nada
 * más.
 */
export class MoverRecetaAGrupo {
  constructor(
    private readonly recetas: IRecetaRepositorio,
    private readonly grupos: IGrupoRecetaRepositorio,
  ) {}

  async ejecutar(datos: DatosMoverReceta): Promise<void> {
    const receta = await this.recetas.obtenerPorId(datos.recetaId);
    if (!receta) {
      throw new ErrorRecetaNoEncontrada(datos.recetaId);
    }

    // Se comprueba la carpeta antes de escribir: la FK la rechazaría igual,
    // pero como error de base y no como "esa carpeta no existe".
    if (
      datos.grupoId !== null &&
      !(await this.grupos.obtenerPorId(datos.grupoId))
    ) {
      throw new ErrorGrupoRecetaNoEncontrado(datos.grupoId);
    }

    await this.recetas.moverAGrupo(datos.recetaId, datos.grupoId);
  }
}
