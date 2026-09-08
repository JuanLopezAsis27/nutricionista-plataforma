import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import {
  AlimentoPropio,
  type DatosNuevoAlimentoPropio,
} from "@/dominio/entidades/AlimentoPropio";

/** Caso de uso: alta manual de un alimento propio (uno por uno, sin planilla). */
export class CrearAlimentoPropio {
  constructor(private readonly repositorio: IAlimentoPropioRepositorio) {}

  async ejecutar(datos: DatosNuevoAlimentoPropio): Promise<AlimentoPropio> {
    return this.repositorio.crear(
      AlimentoPropio.crear(datos, crypto.randomUUID()),
    );
  }
}
