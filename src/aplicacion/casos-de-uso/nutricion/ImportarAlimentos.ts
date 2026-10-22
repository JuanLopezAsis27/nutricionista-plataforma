import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import type { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";
import type { ImagenSubida, ImagenesDeAlimentos } from "./imagenesDeAlimentos";
import {
  leerAlimentosDeLaPlanilla,
  subirImagenesDeLaPlanilla,
  borrarSinFallar,
  type FilaDePlanilla,
  type ResumenImagenes,
} from "./filasDePlanilla";

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
  /** Las imágenes que venían en la planilla. */
  imagenes: ResumenImagenes;
}

/**
 * Caso de uso: importar una lista de alimentos desde una planilla ya parseada
 * (Excel/CSV → filas). REEMPLAZA la lista anterior. Sirve a la del consultorio
 * y al catálogo de la plataforma. Para sumar una planilla sin borrar lo que
 * hay, `AgregarAlimentos`.
 *
 * Las reglas de lectura de las filas (vacías, repetidas, al menos una válida)
 * son las de `leerAlimentosDeLaPlanilla`.
 *
 * Reemplazar la lista NO pierde lo que se cargó a mano sobre ella (migración
 * 84): un alimento de la planilla que ya estaba en la lista (misma
 * `claveIdentidad`) conserva su IMAGEN si la planilla no trae una, y su
 * CATEGORÍA si la planilla no trae una. Sin esto, cada Excel nuevo borraría
 * las fotos y las categorías que se fueron poniendo de a una.
 *
 * Con la misma regla, la UNIDAD BASE y las MEDIDAS (migración 90): si la
 * planilla no las trae para esa fila, quedan las que ya tenía el alimento.
 *
 * Las IMÁGENES de la planilla se suben antes de escribir (las filas entran ya
 * apuntando a su imagen); si la escritura falla, se borran. Una imagen que
 * reemplaza a la anterior de un alimento borra la anterior recién después de
 * escribir.
 */
export class ImportarAlimentos {
  constructor(
    private readonly repositorio: IAlimentoPropioRepositorio,
    /** El catálogo de la plataforma, para contar coincidencias. Ausente al importar el catálogo mismo. */
    private readonly catalogo: IAlimentoPropioRepositorio | null = null,
    /** Dónde guardar las imágenes de la planilla. Sin esto, se ignoran. */
    private readonly imagenes: ImagenesDeAlimentos | null = null,
  ) {}

  async ejecutar(
    filas: FilaDePlanilla[],
  ): Promise<ResultadoImportacionAlimentos> {
    const { porClave, repetidos } = leerAlimentosDeLaPlanilla(filas);

    const anteriores = new Map(
      (await this.repositorio.listar()).map((a) => [a.claveIdentidad, a]),
    );
    const conImagen: Array<{ alimento: AlimentoPropio; imagen: ImagenSubida }> =
      [];
    const nuevos = [...porClave.values()].map(({ alimento, fila }) => {
      if (fila.imagen) conImagen.push({ alimento, imagen: fila.imagen });
      const anterior = anteriores.get(alimento.claveIdentidad);
      if (!anterior) return alimento;
      const previo = anterior.aPrimitivos();
      return alimento
        .actualizar({
          categoria: alimento.aPrimitivos().categoria ?? previo.categoria,
          unidadBase: fila.unidadBase ?? previo.unidadBase,
          medidas: fila.medidas?.length ? fila.medidas : previo.medidas,
        })
        .conImagen(anterior.imagenClave);
    });

    const { claves, descartadas } = await subirImagenesDeLaPlanilla(
      conImagen,
      this.imagenes,
    );
    // Las que la planilla reemplaza: se borran solo si la escritura sale.
    const reemplazadas: string[] = [];
    const aEscribir = nuevos.map((alimento) => {
      const clave = claves.get(alimento.id);
      if (!clave) return alimento;
      if (alimento.imagenClave) reemplazadas.push(alimento.imagenClave);
      return alimento.conImagen(clave);
    });

    let importados: number;
    try {
      importados = await this.repositorio.reemplazarTodos(aEscribir);
    } catch (error) {
      await borrarSinFallar(this.imagenes, [...claves.values()]);
      throw error;
    }
    await borrarSinFallar(this.imagenes, reemplazadas);

    const enPlataforma = this.catalogo
      ? (await this.catalogo.clavesExistentes([...porClave.keys()])).length
      : 0;
    return {
      importados,
      repetidos,
      enPlataforma,
      imagenes: { cargadas: claves.size, descartadas },
    };
  }
}
