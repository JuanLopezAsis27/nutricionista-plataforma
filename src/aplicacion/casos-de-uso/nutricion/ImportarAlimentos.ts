import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import {
  AlimentoPropio,
  type DatosNuevoAlimentoPropio,
} from "@/dominio/entidades/AlimentoPropio";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

const MAXIMO_FILAS = 20000;

/** Qué pasó con la planilla. */
export interface ResultadoImportacionAlimentos {
  /** Alimentos que quedaron en la lista. */
  importados: number;
  /** Filas descartadas por repetir un alimento que la planilla ya traía. */
  repetidos: number;
  /**
   * Cuántos de los importados ya existen en el catálogo de la plataforma.
   * No se descartan (pueden ser la versión propia, con otros macros): se
   * informan. Siempre 0 al importar el propio catálogo.
   */
  enPlataforma: number;
}

/**
 * Caso de uso: importar una lista de alimentos desde una planilla ya parseada
 * (Excel/CSV → filas). REEMPLAZA la lista anterior. Sirve a la del consultorio
 * y al catálogo de la plataforma.
 *
 * Descarta filas sin nombre; valida las macros en la entidad. Al menos una fila
 * válida es obligatoria (una lista vacía no debe pisar la anterior por error).
 *
 * Una planilla con el mismo alimento dos veces (misma `claveIdentidad`) no
 * corta la importación: queda la ÚLTIMA fila —en una planilla que se fue
 * corrigiendo, la de más abajo suele ser la buena— y se informa cuántas se
 * descartaron. Frenar mil filas por un duplicado sería peor que el duplicado.
 *
 * Reemplazar la lista NO pierde lo que se cargó a mano sobre ella (migración
 * 84): un alimento de la planilla que ya estaba en la lista (misma
 * `claveIdentidad`) conserva su IMAGEN, y su CATEGORÍA si la planilla no trae
 * una. Sin esto, cada Excel nuevo borraría las fotos y las categorías que se
 * fueron poniendo de a una.
 */
export class ImportarAlimentos {
  constructor(
    private readonly repositorio: IAlimentoPropioRepositorio,
    /** El catálogo de la plataforma, para contar coincidencias. Ausente al importar el catálogo mismo. */
    private readonly catalogo: IAlimentoPropioRepositorio | null = null,
  ) {}

  async ejecutar(
    filas: DatosNuevoAlimentoPropio[],
  ): Promise<ResultadoImportacionAlimentos> {
    if (filas.length > MAXIMO_FILAS) {
      throw new ErrorValidacion(
        `La planilla supera el máximo de ${MAXIMO_FILAS} filas.`,
      );
    }

    // Map por clave: una fila repetida reemplaza a la anterior y la
    // inserción conserva el orden de la primera aparición.
    const porClave = new Map<string, AlimentoPropio>();
    let validas = 0;
    for (const fila of filas) {
      if (!fila.nombre || fila.nombre.trim() === "") continue; // fila vacía → se ignora
      const alimento = AlimentoPropio.crear(fila, crypto.randomUUID());
      porClave.set(alimento.claveIdentidad, alimento);
      validas++;
    }

    if (porClave.size === 0) {
      throw new ErrorValidacion(
        "La planilla no tiene ningún alimento válido (revisá que haya una columna de nombre).",
      );
    }

    const anteriores = new Map(
      (await this.repositorio.listar()).map((a) => [a.claveIdentidad, a]),
    );
    const nuevos = [...porClave.values()].map((alimento) => {
      const anterior = anteriores.get(alimento.claveIdentidad);
      if (!anterior) return alimento;
      const categoria = alimento.aPrimitivos().categoria;
      return (
        categoria
          ? alimento
          : alimento.actualizar({ categoria: anterior.aPrimitivos().categoria })
      ).conImagen(anterior.imagenClave);
    });

    const importados = await this.repositorio.reemplazarTodos(nuevos);
    const enPlataforma = this.catalogo
      ? (await this.catalogo.clavesExistentes([...porClave.keys()])).length
      : 0;
    return { importados, repetidos: validas - porClave.size, enPlataforma };
  }
}
