import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import type { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";
import {
  FORMATOS_IMAGEN_ALIMENTO,
  TAMANO_MAXIMO_IMAGEN_ALIMENTO,
} from "@/dominio/entidades/AlimentoPropio";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { contenidoCoincideConMime } from "@/dominio/servicios/firmaArchivo";
import { ErrorAlimentoPropioNoEncontrado } from "@/dominio/errores/ErrorAlimentoPropioNoEncontrado";

export interface ImagenSubida {
  contenido: Uint8Array;
  mimeType: string;
}

/**
 * Caso de uso: ponerle (o cambiarle) la imagen a un alimento. Sirve a la lista
 * del consultorio y al catálogo de la plataforma; `prefijo` separa sus objetos
 * en el bucket.
 *
 * La imagen NO es un `Archivo`: `archivos` es tabla de inquilino y un alimento
 * de la plataforma no es de ningún consultorio. Vive como clave en la fila del
 * alimento, y el barrido de huérfanos la consulta antes de borrar.
 *
 * El orden importa: primero se sube la nueva, después se apunta la fila, y
 * recién al final se borra la vieja. Si la fila no se pudo actualizar, se
 * borra la recién subida (compensación) y el alimento queda como estaba.
 * Cada subida lleva un nombre nuevo: es lo que cambia la URL de la imagen y
 * evita que el navegador muestre la anterior de su caché.
 */
export class CambiarImagenAlimento {
  constructor(
    private readonly repositorio: IAlimentoPropioRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
    private readonly prefijo: string,
  ) {}

  async ejecutar(id: string, imagen: ImagenSubida): Promise<AlimentoPropio> {
    const extension = FORMATOS_IMAGEN_ALIMENTO[imagen.mimeType];
    if (!extension) {
      throw new ErrorValidacion("La imagen tiene que ser JPG, PNG o WebP.");
    }
    // El tipo lo declara el navegador; los primeros bytes dicen si es cierto.
    // Es la misma defensa que las subidas de `archivos` (ver docs/ARCHIVOS.md).
    if (!contenidoCoincideConMime(imagen.contenido, imagen.mimeType)) {
      throw new ErrorValidacion("El archivo no es una imagen válida.");
    }
    if (imagen.contenido.byteLength > TAMANO_MAXIMO_IMAGEN_ALIMENTO) {
      throw new ErrorValidacion("La imagen no puede superar los 2 MB.");
    }

    const alimento = await this.repositorio.obtenerPorId(id);
    if (!alimento) throw new ErrorAlimentoPropioNoEncontrado(id);

    const clave = `${this.prefijo}/${id}/${crypto.randomUUID()}.${extension}`;
    await this.almacenamiento.subir(clave, imagen.contenido, imagen.mimeType);

    let actualizado: AlimentoPropio;
    try {
      actualizado = await this.repositorio.actualizar(
        alimento.conImagen(clave),
      );
    } catch (error) {
      await this.almacenamiento.eliminar(clave);
      throw error;
    }

    if (alimento.imagenClave) {
      await this.almacenamiento.eliminar(alimento.imagenClave);
    }
    return actualizado;
  }
}
