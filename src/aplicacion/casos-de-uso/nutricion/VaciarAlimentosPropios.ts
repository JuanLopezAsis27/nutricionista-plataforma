import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";

/**
 * Caso de uso: borrar la lista propia del nutricionista. Al quedar vacía, la
 * búsqueda de ingredientes vuelve a usar FatSecret / Open Food Facts.
 */
export class VaciarAlimentosPropios {
  constructor(private readonly repositorio: IAlimentoPropioRepositorio) {}

  async ejecutar(): Promise<void> {
    await this.repositorio.vaciar();
  }
}
