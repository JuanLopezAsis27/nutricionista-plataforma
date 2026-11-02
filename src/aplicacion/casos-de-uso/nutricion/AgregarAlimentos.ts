import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import type { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";
import type { ImagenSubida, ImagenesDeAlimentos } from "./imagenesDeAlimentos";
import type { CategoriasDisponibles } from "../categorias-alimento/CategoriasDisponibles";
import {
  leerAlimentosDeLaPlanilla,
  subirImagenesDeLaPlanilla,
  borrarSinFallar,
  type FilaDePlanilla,
  type ResumenImagenes,
} from "./filasDePlanilla";

/** Cuántos de los que ya estaban se nombran en el resultado. */
const EJEMPLOS_YA_ESTABAN = 5;

/** Qué pasó con la planilla que se sumó a la lista. */
export interface ResultadoAgregadoAlimentos {
  /** Alimentos que entraron a la lista. */
  agregados: number;
  /** Filas descartadas por repetir un alimento que la planilla ya traía. */
  repetidos: number;
  /** Alimentos de la planilla que ya estaban en la lista: no se tocaron. */
  yaEstaban: number;
  /** Algunos de esos, con la escritura de la LISTA (para poder encontrarlos). */
  ejemplosYaEstaban: string[];
  /**
   * Cuántos de los agregados ya existen en el catálogo de la plataforma: son
   * la versión del profesional y entran igual. Siempre 0 en el catálogo mismo.
   */
  enPlataforma: number;
  /** Las imágenes de los alimentos que entraron (las de los que ya estaban se ignoran). */
  imagenes: ResumenImagenes;
}

/**
 * Caso de uso: SUMAR los alimentos de una planilla a la lista, sin borrar los
 * que ya están (el gemelo de `ImportarAlimentos`, que la reemplaza). Sirve a
 * la lista del consultorio y al catálogo de la plataforma.
 *
 * Sigue la regla del alta manual (`CrearAlimentoPropio`): un alimento no se
 * carga dos veces en la misma lista (`claveIdentidad`: nombre y marca, sin
 * mayúsculas, tildes ni espacios de más). Pero no lanza como el alta: un
 * repetido entre mil filas no puede frenar las otras 999. El que ya estaba
 * NO SE TOCA —ni sus macros, ni su imagen, ni sus medidas— y se informa
 * nombrándolo con su escritura. Para pisar macros está editar o reemplazar.
 *
 * Igual que en el alta, uno igual a uno de la PLATAFORMA no es un repetido:
 * es la versión del profesional. Entra y se cuenta en `enPlataforma`.
 *
 * Las imágenes de la planilla entran solo con los alimentos NUEVOS: el que ya
 * estaba no se toca, tampoco su imagen. Se suben antes de escribir y se
 * borran si la escritura falla.
 */
export class AgregarAlimentos {
  constructor(
    private readonly repositorio: IAlimentoPropioRepositorio,
    /** El catálogo de la plataforma, para contar coincidencias. Ausente al agregar al catálogo mismo. */
    private readonly catalogo: IAlimentoPropioRepositorio | null = null,
    /** Dónde guardar las imágenes de la planilla. Sin esto, se ignoran. */
    private readonly imagenes: ImagenesDeAlimentos | null = null,
    /**
     * Las categorías que puede llevar un alimento de esta lista, para leer la
     * columna «Categoría» (migración 93). Sin esto, la columna se ignora.
     */
    private readonly categorias: CategoriasDisponibles | null = null,
  ) {}

  async ejecutar(filas: FilaDePlanilla[]): Promise<ResultadoAgregadoAlimentos> {
    const { porClave, repetidos } = leerAlimentosDeLaPlanilla(
      filas,
      (await this.categorias?.todas()) ?? [],
    );

    const existentes = new Map(
      (await this.repositorio.listar()).map((a) => [a.claveIdentidad, a]),
    );
    const deLaPlanilla = [...porClave.values()].filter(
      ({ alimento }) => !existentes.has(alimento.claveIdentidad),
    );
    const conImagen: Array<{ alimento: AlimentoPropio; imagen: ImagenSubida }> =
      deLaPlanilla.flatMap(({ alimento, fila }) =>
        fila.imagen ? [{ alimento, imagen: fila.imagen }] : [],
      );
    const yaEstaban = [...porClave.keys()].flatMap((clave) => {
      const existente = existentes.get(clave);
      return existente ? [existente.etiqueta] : [];
    });

    const { claves, descartadas } = await subirImagenesDeLaPlanilla(
      conImagen,
      this.imagenes,
    );
    const nuevos = deLaPlanilla.map(({ alimento }) => {
      const clave = claves.get(alimento.id);
      return clave ? alimento.conImagen(clave) : alimento;
    });

    let agregados = 0;
    try {
      if (nuevos.length > 0) {
        agregados = await this.repositorio.agregarVarios(nuevos);
      }
    } catch (error) {
      await borrarSinFallar(this.imagenes, [...claves.values()]);
      throw error;
    }
    const enPlataforma =
      this.catalogo && nuevos.length > 0
        ? (
            await this.catalogo.clavesExistentes(
              nuevos.map((a) => a.claveIdentidad),
            )
          ).length
        : 0;

    return {
      agregados,
      repetidos,
      yaEstaban: yaEstaban.length,
      ejemplosYaEstaban: yaEstaban.slice(0, EJEMPLOS_YA_ESTABAN),
      enPlataforma,
      imagenes: { cargadas: claves.size, descartadas },
    };
  }
}
