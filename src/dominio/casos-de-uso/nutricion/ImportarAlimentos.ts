import type { IAlimentoPropioRepositorio } from "../../repositorios/IAlimentoPropioRepositorio";
import {
  AlimentoPropio,
  type DatosNuevoAlimentoPropio,
} from "../../entidades/AlimentoPropio";
import { ErrorValidacion } from "../../errores/ErrorValidacion";

const MAXIMO_FILAS = 20000;

/**
 * Caso de uso: importar la lista de alimentos propios del nutricionista desde
 * una planilla ya parseada (Excel/CSV → filas). REEMPLAZA la lista anterior.
 * Descarta filas sin nombre; valida las macros en la entidad. Al menos una fila
 * válida es obligatoria (una lista vacía no debe pisar la anterior por error).
 */
export class ImportarAlimentos {
  constructor(private readonly repositorio: IAlimentoPropioRepositorio) {}

  async ejecutar(filas: DatosNuevoAlimentoPropio[]): Promise<number> {
    if (filas.length > MAXIMO_FILAS) {
      throw new ErrorValidacion(
        `La planilla supera el máximo de ${MAXIMO_FILAS} filas.`,
      );
    }

    const alimentos: AlimentoPropio[] = [];
    for (const fila of filas) {
      if (!fila.nombre || fila.nombre.trim() === "") continue; // fila vacía → se ignora
      alimentos.push(AlimentoPropio.crear(fila, crypto.randomUUID()));
    }

    if (alimentos.length === 0) {
      throw new ErrorValidacion(
        "La planilla no tiene ningún alimento válido (revisá que haya una columna de nombre).",
      );
    }

    return this.repositorio.reemplazarTodos(alimentos);
  }
}
