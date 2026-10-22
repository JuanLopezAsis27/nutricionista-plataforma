import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import type { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";

/**
 * Caso de uso: la lista COMPLETA, sin paginar y por nombre, para descargarla
 * como planilla. Sirve a la lista del consultorio y al catálogo de la
 * plataforma.
 */
export class ObtenerTodosLosAlimentos {
  constructor(private readonly repositorio: IAlimentoPropioRepositorio) {}

  ejecutar(): Promise<AlimentoPropio[]> {
    return this.repositorio.listar();
  }
}
