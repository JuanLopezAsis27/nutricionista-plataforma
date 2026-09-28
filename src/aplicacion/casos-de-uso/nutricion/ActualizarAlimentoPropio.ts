import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import type {
  AlimentoPropio,
  DatosNuevoAlimentoPropio,
} from "@/dominio/entidades/AlimentoPropio";
import { ErrorAlimentoPropioNoEncontrado } from "@/dominio/errores/ErrorAlimentoPropioNoEncontrado";
import { ErrorAlimentoDuplicado } from "@/dominio/errores/ErrorAlimentoDuplicado";

/**
 * Caso de uso: editar un alimento existente.
 *
 * Renombrarlo (o cambiarle la marca) hasta chocar con OTRO de la lista es
 * duplicarlo por la puerta de atrás, así que se chequea igual que en el alta.
 * Chocar consigo mismo no cuenta: corregir «avena» a «Avena» es legítimo.
 */
export class ActualizarAlimentoPropio {
  constructor(private readonly repositorio: IAlimentoPropioRepositorio) {}

  async ejecutar(
    id: string,
    cambios: Partial<DatosNuevoAlimentoPropio>,
  ): Promise<AlimentoPropio> {
    const alimento = await this.repositorio.obtenerPorId(id);
    if (!alimento) {
      throw new ErrorAlimentoPropioNoEncontrado(id);
    }
    const actualizado = alimento.actualizar(cambios);
    const existente = await this.repositorio.obtenerPorClave(
      actualizado.claveIdentidad,
    );
    if (existente && existente.id !== id) {
      throw new ErrorAlimentoDuplicado(existente.etiqueta);
    }
    return this.repositorio.actualizar(actualizado);
  }
}
