import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import type { IOptimizadorImagenes } from "@/dominio/servicios/IOptimizadorImagenes";
import {
  FORMATOS_IMAGEN_ALIMENTO,
  LADO_MAXIMO_IMAGEN_ALIMENTO,
  PIXELES_MAXIMOS_IMAGEN_ALIMENTO,
  TAMANO_MAXIMO_IMAGEN_ALIMENTO,
} from "@/dominio/entidades/AlimentoPropio";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { contenidoCoincideConMime } from "@/dominio/servicios/firmaArchivo";

/** Una imagen tal como llega: de un formulario o de adentro de un Excel. */
export interface ImagenSubida {
  contenido: Uint8Array;
  mimeType: string;
}

/**
 * Las imágenes de una lista de alimentos en el bucket: la regla de qué se
 * acepta, cómo se achica y dónde se guarda. La comparten el alta a mano
 * (`CambiarImagenAlimento`) y la importación de una planilla con imágenes,
 * para que una foto que entra por el Excel cumpla lo mismo que una subida de
 * a una.
 *
 * `prefijo` separa en el bucket la lista del consultorio de la de la
 * plataforma.
 */
export class ImagenesDeAlimentos {
  constructor(
    private readonly almacenamiento: IAlmacenamientoArchivos,
    private readonly optimizador: IOptimizadorImagenes,
    private readonly prefijo: string,
  ) {}

  /**
   * Valida la imagen y la achica. Lanza `ErrorValidacion` con el motivo en
   * palabras del usuario.
   *
   * - Formato: JPG, PNG o WebP, con la firma de sus primeros bytes verificada
   *   (el tipo lo declara quien sube; los bytes dicen si es cierto).
   * - Peso: hasta `TAMANO_MAXIMO_IMAGEN_ALIMENTO` (2 MB).
   * - Lo que se guarda: reducida a `LADO_MAXIMO_IMAGEN_ALIMENTO` px de lado,
   *   en WebP y sin metadatos.
   */
  async preparar(imagen: ImagenSubida): Promise<ImagenSubida> {
    if (!FORMATOS_IMAGEN_ALIMENTO[imagen.mimeType]) {
      throw new ErrorValidacion("La imagen tiene que ser JPG, PNG o WebP.");
    }
    if (!contenidoCoincideConMime(imagen.contenido, imagen.mimeType)) {
      throw new ErrorValidacion("El archivo no es una imagen válida.");
    }
    if (imagen.contenido.byteLength > TAMANO_MAXIMO_IMAGEN_ALIMENTO) {
      throw new ErrorValidacion(
        `La imagen no puede superar los ${TAMANO_MAXIMO_IMAGEN_ALIMENTO / 1024 / 1024} MB.`,
      );
    }
    const reducida = await this.optimizador.reducir(
      imagen.contenido,
      LADO_MAXIMO_IMAGEN_ALIMENTO,
      PIXELES_MAXIMOS_IMAGEN_ALIMENTO,
    );
    return { contenido: reducida.contenido, mimeType: reducida.mimeType };
  }

  /**
   * Sube una imagen ya preparada y devuelve su clave. Cada subida lleva un
   * nombre nuevo: es lo que cambia la URL de la imagen y evita que el
   * navegador muestre la anterior desde su caché.
   */
  async subir(alimentoId: string, imagen: ImagenSubida): Promise<string> {
    const extension = FORMATOS_IMAGEN_ALIMENTO[imagen.mimeType];
    const clave = `${this.prefijo}/${alimentoId}/${crypto.randomUUID()}.${extension}`;
    await this.almacenamiento.subir(clave, imagen.contenido, imagen.mimeType);
    return clave;
  }

  eliminar(clave: string): Promise<void> {
    return this.almacenamiento.eliminar(clave);
  }
}
