import {
  AlimentoPropio,
  type DatosNuevoAlimentoPropio,
} from "@/dominio/entidades/AlimentoPropio";
import {
  categoriaDesdeTexto,
  type CategoriaDeAlimento,
} from "@/dominio/entidades/CategoriaAlimento";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import type { ImagenSubida, ImagenesDeAlimentos } from "./imagenesDeAlimentos";

export const MAXIMO_FILAS_PLANILLA = 20000;

/** Imágenes que se procesan a la vez al importar: el bucket puede estar lejos. */
const SUBIDAS_EN_PARALELO = 4;

/**
 * Una fila de la planilla, con la imagen que traía en su celda (si traía).
 *
 * La categoría llega como TEXTO («Lácteos», «geles»): cuál es se decide
 * contra las categorías de la lista (migración 93), que el parser no conoce.
 */
export interface FilaDePlanilla extends Omit<
  DatosNuevoAlimentoPropio,
  "categoria"
> {
  categoriaTexto?: string | null;
  imagen?: ImagenSubida | null;
}

/** Un alimento de la planilla y la fila de la que salió. */
export interface AlimentoDeLaPlanilla {
  alimento: AlimentoPropio;
  /**
   * La fila tal como vino: dice si la planilla trajo unidad, medidas e
   * imagen, o si hay que conservar las del alimento que ya estaba.
   */
  fila: FilaDePlanilla;
}

export interface AlimentosDeLaPlanilla {
  /** Por `claveIdentidad`, en el orden de la primera aparición. */
  porClave: Map<string, AlimentoDeLaPlanilla>;
  /** Filas descartadas por repetir un alimento que la planilla ya traía. */
  repetidos: number;
}

/** Cómo les fue a las imágenes de la planilla. */
export interface ResumenImagenes {
  /** Las que quedaron guardadas en su alimento. */
  cargadas: number;
  /** Por qué no entró cada una de las otras: «Avena: supera los 2 MB». */
  descartadas: string[];
}

/**
 * Las filas de una planilla, ya parseadas, como alimentos. Lo comparten
 * reemplazar la lista (`ImportarAlimentos`) y sumarle otra planilla
 * (`AgregarAlimentos`): las dos leen la planilla con las mismas reglas.
 *
 * - Una fila sin nombre se ignora; las macros las valida la entidad.
 * - La categoría se busca por su texto entre `categorias`; un texto que no
 *   nombra ninguna deja al alimento sin categoría, sin cortar nada.
 * - Al menos una fila válida es obligatoria (una planilla vacía es un error
 *   de archivo, no una lista vacía).
 * - El mismo alimento dos veces (misma `claveIdentidad`) no corta nada: queda
 *   la ÚLTIMA fila —en una planilla que se fue corrigiendo, la de más abajo
 *   suele ser la buena—, con su imagen, y se cuenta en `repetidos`.
 */
export function leerAlimentosDeLaPlanilla(
  filas: FilaDePlanilla[],
  categorias: ReadonlyArray<CategoriaDeAlimento> = [],
): AlimentosDeLaPlanilla {
  if (filas.length > MAXIMO_FILAS_PLANILLA) {
    throw new ErrorValidacion(
      `La planilla supera el máximo de ${MAXIMO_FILAS_PLANILLA} filas.`,
    );
  }

  // Un Map conserva el lugar de la primera aparición aunque se pise el valor.
  const porClave = new Map<string, AlimentoDeLaPlanilla>();
  let validas = 0;
  for (const fila of filas) {
    if (!fila.nombre || fila.nombre.trim() === "") continue; // fila vacía → se ignora
    const alimento = AlimentoPropio.crear(
      {
        ...fila,
        categoria: categoriaDesdeTexto(fila.categoriaTexto, categorias),
      },
      crypto.randomUUID(),
    );
    porClave.set(alimento.claveIdentidad, { alimento, fila });
    validas++;
  }

  if (porClave.size === 0) {
    throw new ErrorValidacion(
      "La planilla no tiene ningún alimento válido (revisá que haya una columna de nombre).",
    );
  }
  return { porClave, repetidos: validas - porClave.size };
}

/**
 * Prepara y sube las imágenes que traía la planilla, ANTES de escribir los
 * alimentos (las filas se insertan ya apuntando a su imagen). Devuelve la
 * clave de cada una por id de alimento.
 *
 * Una imagen que no cumple la regla (formato, peso, píxeles) NO corta la
 * importación: el alimento entra sin ella y el motivo se informa, igual que
 * una categoría que no se reconoce. Un fallo del bucket, en cambio, sí corta:
 * se borran las que ya se habían subido y el error sigue.
 *
 * La misma imagen en varias filas se achica UNA vez: el parser les da los
 * mismos bytes (el mismo `Uint8Array`), y eso es lo que se recuerda. Sin
 * esto, una foto pegada en 20.000 filas eran 20.000 pasadas por sharp.
 * Cada alimento sube igual su propia copia, porque la clave del bucket es
 * del alimento y se borra con él.
 */
export async function subirImagenesDeLaPlanilla(
  conImagen: Array<{ alimento: AlimentoPropio; imagen: ImagenSubida }>,
  imagenes: ImagenesDeAlimentos | null,
): Promise<{ claves: Map<string, string>; descartadas: string[] }> {
  const claves = new Map<string, string>();
  const descartadas: string[] = [];
  if (!imagenes || conImagen.length === 0) return { claves, descartadas };
  const servicio = imagenes;
  // Por bytes Y tipo declarado: los mismos bytes declarados como GIF se
  // rechazan, y como PNG no.
  const preparadas = new Map<Uint8Array, Map<string, Promise<ImagenSubida>>>();
  const preparar = (imagen: ImagenSubida): Promise<ImagenSubida> => {
    const porTipo =
      preparadas.get(imagen.contenido) ??
      new Map<string, Promise<ImagenSubida>>();
    preparadas.set(imagen.contenido, porTipo);
    const enCurso = porTipo.get(imagen.mimeType);
    if (enCurso) return enCurso;
    const nueva = servicio.preparar(imagen);
    porTipo.set(imagen.mimeType, nueva);
    return nueva;
  };

  const pendientes = [...conImagen];
  async function trabajar(): Promise<void> {
    for (
      let siguiente = pendientes.shift();
      siguiente;
      siguiente = pendientes.shift()
    ) {
      const { alimento, imagen } = siguiente;
      let preparada: ImagenSubida;
      try {
        preparada = await preparar(imagen);
      } catch (error) {
        if (!(error instanceof ErrorValidacion)) throw error;
        descartadas.push(`${alimento.etiqueta}: ${error.message}`);
        continue;
      }
      claves.set(alimento.id, await servicio.subir(alimento.id, preparada));
    }
  }

  try {
    await Promise.all(
      Array.from({ length: SUBIDAS_EN_PARALELO }, () => trabajar()),
    );
  } catch (error) {
    pendientes.length = 0; // que los otros trabajadores no sigan subiendo
    await borrarSinFallar(imagenes, [...claves.values()]);
    throw error;
  }
  return { claves, descartadas };
}

/**
 * Borra imágenes del bucket sin que un fallo cambie el resultado de la
 * importación, que ya quedó escrita: lo que no se pueda borrar queda sin fila
 * que lo nombre y lo limpia el barrido de huérfanos (`LimpiarArchivosHuerfanos`).
 */
export async function borrarSinFallar(
  imagenes: ImagenesDeAlimentos | null,
  claves: string[],
): Promise<void> {
  if (!imagenes) return;
  await Promise.allSettled(claves.map((clave) => imagenes.eliminar(clave)));
}
