import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import type { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";
import { ErrorAlimentoPropioNoEncontrado } from "@/dominio/errores/ErrorAlimentoPropioNoEncontrado";

/**
 * Caso de uso: sacarle la imagen a un alimento. Primero la fila, después el
 * objeto: si el borrado del bucket falla, lo termina el barrido de huérfanos.
 */
export class QuitarImagenAlimento {
  constructor(
    private readonly repositorio: IAlimentoPropioRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
  ) {}

  async ejecutar(id: string): Promise<AlimentoPropio> {
    const alimento = await this.repositorio.obtenerPorId(id);
    if (!alimento) throw new ErrorAlimentoPropioNoEncontrado(id);
    if (!alimento.imagenClave) return alimento;

    const actualizado = await this.repositorio.actualizar(
      alimento.conImagen(null),
    );
    await this.almacenamiento.eliminar(alimento.imagenClave);
    return actualizado;
  }
}
