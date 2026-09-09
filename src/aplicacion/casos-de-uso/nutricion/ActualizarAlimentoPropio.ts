import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import type {
  AlimentoPropio,
  DatosNuevoAlimentoPropio,
} from "@/dominio/entidades/AlimentoPropio";
import { ErrorAlimentoPropioNoEncontrado } from "@/dominio/errores/ErrorAlimentoPropioNoEncontrado";

/** Caso de uso: editar un alimento propio existente. */
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
    return this.repositorio.actualizar(alimento.actualizar(cambios));
  }
}
