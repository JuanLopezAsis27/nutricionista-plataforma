import sharp from "sharp";
import type {
  IOptimizadorImagenes,
  ImagenReducida,
} from "@/dominio/servicios/IOptimizadorImagenes";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/** Calidad del WebP: a 512 px no se distingue de la original y pesa poco. */
const CALIDAD_WEBP = 80;

/**
 * Optimizador de imágenes con sharp (libvips), el mismo motor que usa Next
 * para optimizar imágenes.
 *
 * `limitInputPixels` es la defensa contra las bombas de descompresión: sharp
 * lee las dimensiones del encabezado y corta ANTES de reservar memoria para
 * los píxeles. Los metadatos no se copian a la salida (es lo que hace sharp
 * por defecto), así que la ubicación GPS de una foto de celular no llega al
 * bucket.
 */
export class OptimizadorImagenesSharp implements IOptimizadorImagenes {
  async reducir(
    contenido: Uint8Array,
    ladoMaximo: number,
    pixelesMaximos: number,
  ): Promise<ImagenReducida> {
    try {
      const { data, info } = await sharp(contenido, {
        limitInputPixels: pixelesMaximos,
        // Un GIF animado o un WebP con cuadros: alcanza con el primero.
        animated: false,
      })
        .rotate() // según la orientación EXIF
        .resize({
          width: ladoMaximo,
          height: ladoMaximo,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: CALIDAD_WEBP })
        .toUint8Array();
      return {
        contenido: data,
        mimeType: "image/webp",
        ancho: info.width,
        alto: info.height,
      };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "";
      // El mensaje de sharp es técnico («Input image exceeds pixel limit»);
      // al usuario le va el motivo en sus palabras.
      throw new ErrorValidacion(
        /pixel limit/i.test(mensaje)
          ? `La imagen es demasiado grande (más de ${Math.round(pixelesMaximos / 1_000_000)} megapíxeles).`
          : "El archivo no es una imagen que se pueda leer.",
      );
    }
  }
}
