import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import { FORMATOS_IMAGEN_ALIMENTO } from "@/dominio/entidades/AlimentoPropio";
import { ErrorAlimentoPropioNoEncontrado } from "@/dominio/errores/ErrorAlimentoPropioNoEncontrado";

export interface ImagenAlimento {
  contenido: Uint8Array;
  mimeType: string;
}

/**
 * Caso de uso: el contenido de la imagen de un alimento, para servirla desde
 * la app (nunca por URL firmada: ver docs/ARCHIVOS.md).
 *
 * Quién puede verla lo decide el repositorio que se le cablea: la lista propia
 * filtra por el consultorio de la sesión, así que la imagen de un alimento de
 * otro consultorio es, para este caso de uso, un alimento que no existe.
 */
export class ObtenerImagenAlimento {
  constructor(
    private readonly repositorio: IAlimentoPropioRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
  ) {}

  async ejecutar(id: string): Promise<ImagenAlimento> {
    const alimento = await this.repositorio.obtenerPorId(id);
    if (!alimento?.imagenClave) throw new ErrorAlimentoPropioNoEncontrado(id);

    const extension = alimento.imagenClave.split(".").pop() ?? "";
    const mimeType =
      Object.entries(FORMATOS_IMAGEN_ALIMENTO).find(
        ([, ext]) => ext === extension,
      )?.[0] ?? "application/octet-stream";

    return {
      contenido: await this.almacenamiento.descargar(alimento.imagenClave),
      mimeType,
    };
  }
}
