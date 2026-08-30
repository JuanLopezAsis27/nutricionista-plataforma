import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";

/** Estado de la lista propia: cuántos alimentos hay y si desactiva FatSecret. */
export interface EstadoAlimentosPropios {
  cantidad: number;
  /** Si es true, la búsqueda usa la lista propia y FatSecret queda desactivado. */
  activo: boolean;
}

/**
 * Caso de uso: informar si el nutricionista tiene una lista de alimentos propia
 * cargada (y cuántos). La UI lo usa para avisar que FatSecret está desactivado.
 */
export class ObtenerEstadoAlimentosPropios {
  constructor(private readonly repositorio: IAlimentoPropioRepositorio) {}

  async ejecutar(): Promise<EstadoAlimentosPropios> {
    const cantidad = await this.repositorio.contar();
    return { cantidad, activo: cantidad > 0 };
  }
}
