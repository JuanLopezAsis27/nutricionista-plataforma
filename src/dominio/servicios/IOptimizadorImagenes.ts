/** Una imagen ya reducida, lista para guardar. */
export interface ImagenReducida {
  contenido: Uint8Array;
  mimeType: "image/webp";
  ancho: number;
  alto: number;
}

/**
 * Puerto para achicar imágenes antes de guardarlas (las de los alimentos).
 * La implementación vive en infraestructura (sharp).
 */
export interface IOptimizadorImagenes {
  /**
   * Reduce la imagen hasta que entre en un cuadrado de `ladoMaximo` (sin
   * agrandarla si ya es chica), la endereza según su orientación EXIF, le
   * saca los metadatos —una foto de celular trae dónde se sacó— y la
   * convierte a WebP.
   *
   * Lanza `ErrorValidacion` si el contenido no se puede leer como imagen o si
   * supera `pixelesMaximos` (ancho × alto), sin llegar a descomprimirla.
   */
  reducir(
    contenido: Uint8Array,
    ladoMaximo: number,
    pixelesMaximos: number,
  ): Promise<ImagenReducida>;
}
