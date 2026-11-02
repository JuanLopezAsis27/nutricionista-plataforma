import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import type { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";
import { ErrorAlimentoPropioNoEncontrado } from "@/dominio/errores/ErrorAlimentoPropioNoEncontrado";
import { ErrorAlimentoDuplicado } from "@/dominio/errores/ErrorAlimentoDuplicado";
import type { CategoriasDisponibles } from "../categorias-alimento/CategoriasDisponibles";
import type { DatosAltaAlimento } from "./CrearAlimentoPropio";

/**
 * Caso de uso: editar un alimento existente.
 *
 * Renombrarlo (o cambiarle la marca) hasta chocar con OTRO de la lista es
 * duplicarlo por la puerta de atrás, así que se chequea igual que en el alta.
 * Chocar consigo mismo no cuenta: corregir «avena» a «Avena» es legítimo.
 *
 * Una categoría ausente en los cambios queda como estaba; `null` la quita.
 */
export class ActualizarAlimentoPropio {
  constructor(
    private readonly repositorio: IAlimentoPropioRepositorio,
    private readonly categorias: CategoriasDisponibles | null = null,
  ) {}

  async ejecutar(
    id: string,
    cambios: Partial<DatosAltaAlimento>,
  ): Promise<AlimentoPropio> {
    const alimento = await this.repositorio.obtenerPorId(id);
    if (!alimento) {
      throw new ErrorAlimentoPropioNoEncontrado(id);
    }
    const { categoriaId, ...resto } = cambios;
    const categoria = this.categorias
      ? await this.categorias.resolver(categoriaId)
      : undefined;
    const actualizado = alimento.actualizar({
      ...resto,
      ...(categoria !== undefined ? { categoria } : {}),
    });
    const existente = await this.repositorio.obtenerPorClave(
      actualizado.claveIdentidad,
    );
    if (existente && existente.id !== id) {
      throw new ErrorAlimentoDuplicado(existente.etiqueta);
    }
    return this.repositorio.actualizar(actualizado);
  }
}
