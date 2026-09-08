import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";

/** Estado de la lista propia: cuántos alimentos hay y si desactiva la búsqueda externa. */
export interface EstadoAlimentosPropios {
  cantidad: number;
  /** Si es true, la búsqueda usa la lista propia y no sale a internet. */
  activo: boolean;
}

/**
 * Caso de uso: informar si el nutricionista tiene una lista de alimentos propia
 * cargada (y cuántos). La UI lo usa para avisar que no se consulta ninguna API.
 */
export class ObtenerEstadoAlimentosPropios {
  constructor(private readonly repositorio: IAlimentoPropioRepositorio) {}

  async ejecutar(): Promise<EstadoAlimentosPropios> {
    const cantidad = await this.repositorio.contar();
    return { cantidad, activo: cantidad > 0 };
  }
}
