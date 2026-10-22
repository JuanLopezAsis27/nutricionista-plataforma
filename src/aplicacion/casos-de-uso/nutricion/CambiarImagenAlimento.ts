import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import type { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";
import { ErrorAlimentoPropioNoEncontrado } from "@/dominio/errores/ErrorAlimentoPropioNoEncontrado";
import type { ImagenSubida, ImagenesDeAlimentos } from "./imagenesDeAlimentos";

export type { ImagenSubida } from "./imagenesDeAlimentos";

/**
 * Caso de uso: ponerle (o cambiarle) la imagen a un alimento. Sirve a la lista
 * del consultorio y al catálogo de la plataforma.
 *
 * La imagen NO es un `Archivo`: `archivos` es tabla de inquilino y un alimento
 * de la plataforma no es de ningún consultorio. Vive como clave en la fila del
 * alimento, y el barrido de huérfanos la consulta antes de borrar.
 *
 * Qué imagen se acepta y cómo se achica lo decide `ImagenesDeAlimentos`, la
 * misma regla que para las imágenes que llegan dentro de un Excel.
 *
 * El orden importa: primero se sube la nueva, después se apunta la fila, y
 * recién al final se borra la vieja. Si la fila no se pudo actualizar, se
 * borra la recién subida (compensación) y el alimento queda como estaba.
 */
export class CambiarImagenAlimento {
  constructor(
    private readonly repositorio: IAlimentoPropioRepositorio,
    private readonly imagenes: ImagenesDeAlimentos,
  ) {}

  async ejecutar(id: string, imagen: ImagenSubida): Promise<AlimentoPropio> {
    const preparada = await this.imagenes.preparar(imagen);

    const alimento = await this.repositorio.obtenerPorId(id);
    if (!alimento) throw new ErrorAlimentoPropioNoEncontrado(id);

    const clave = await this.imagenes.subir(id, preparada);

    let actualizado: AlimentoPropio;
    try {
      actualizado = await this.repositorio.actualizar(
        alimento.conImagen(clave),
      );
    } catch (error) {
      await this.imagenes.eliminar(clave);
      throw error;
    }

    if (alimento.imagenClave) {
      await this.imagenes.eliminar(alimento.imagenClave);
    }
    return actualizado;
  }
}
