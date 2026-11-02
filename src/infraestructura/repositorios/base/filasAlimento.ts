import type { Prisma } from "@prisma/client";
import { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";
import type { CategoriaDeAlimento } from "@/dominio/entidades/CategoriaAlimento";
import type { FiltroAlimentosPropios } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import { medidasAJson, medidasDeJson } from "./medidasJson";

/**
 * Lo que comparten las dos tablas de alimentos (`alimentos_propios` y
 * `alimentos_base`): tienen las mismas columnas salvo el inquilino y la
 * categoría PROPIA (solo la lista de un consultorio la puede llevar), así que
 * la fila se arma y se lee igual. Tenerlo una vez evita que una columna nueva
 * se escriba en una lista y no en la otra.
 */

/** La categoría, como la trae el `include` (solo lo que se muestra). */
interface FilaCategoria {
  id: string;
  nombre: string;
}

/** Include de la lista del consultorio: las dos categorías posibles. */
export const INCLUIR_CATEGORIAS_PROPIO = {
  categoria: { select: { id: true, nombre: true } },
  categoriaPropia: { select: { id: true, nombre: true } },
} satisfies Prisma.AlimentoPropioInclude;

/** Include del catálogo de la plataforma: solo predeterminadas. */
export const INCLUIR_CATEGORIAS_BASE = {
  categoria: { select: { id: true, nombre: true } },
} satisfies Prisma.AlimentoBaseInclude;

/** Las columnas comunes de una fila de alimento, con su categoría incluida. */
export interface FilaAlimento {
  id: string;
  nombre: string;
  marca: string | null;
  caloriasPor100: Prisma.Decimal | null;
  proteinasPor100: Prisma.Decimal | null;
  carbohidratosPor100: Prisma.Decimal | null;
  grasasPor100: Prisma.Decimal | null;
  cafeinaPor100: Prisma.Decimal | null;
  descripcion: string | null;
  unidadBase: "GRAMO" | "MILILITRO";
  medidas: Prisma.JsonValue;
  imagenClave: string | null;
  categoria: FilaCategoria | null;
  /** Solo en `alimentos_propios`. */
  categoriaPropia?: FilaCategoria | null;
}

/** Decimal nunca cruza infraestructura: se mapea a number. */
function aNumero(valor: Prisma.Decimal | null): number | null {
  return valor === null ? null : valor.toNumber();
}

/**
 * Entidad → columnas a escribir (sin inquilino). La categoría va a
 * `categoriaId` si es predeterminada; si es propia, la escribe
 * `columnaCategoriaPropia` (solo la lista del consultorio tiene esa columna).
 */
export function datosDeAlimento(alimento: AlimentoPropio) {
  const p = alimento.aPrimitivos();
  return {
    id: p.id,
    nombre: p.nombre,
    nombreNormalizado: alimento.nombreNormalizado,
    claveIdentidad: alimento.claveIdentidad,
    marca: p.marca,
    caloriasPor100: p.caloriasPor100,
    proteinasPor100: p.proteinasPor100,
    carbohidratosPor100: p.carbohidratosPor100,
    grasasPor100: p.grasasPor100,
    cafeinaPor100: p.cafeinaPor100,
    descripcion: p.descripcion,
    unidadBase: p.unidadBase,
    medidas: medidasAJson(p.medidas),
    categoriaId: p.categoria && !p.categoria.propia ? p.categoria.id : null,
    imagenClave: p.imagenClave,
  };
}

/** La columna de la categoría PROPIA (solo `alimentos_propios`). */
export function columnaCategoriaPropia(alimento: AlimentoPropio): {
  categoriaPropiaId: string | null;
} {
  const categoria = alimento.aPrimitivos().categoria;
  return { categoriaPropiaId: categoria?.propia ? categoria.id : null };
}

/** Fila → entidad. */
export function mapearFilaAlimento(fila: FilaAlimento): AlimentoPropio {
  return AlimentoPropio.reconstruir({
    id: fila.id,
    nombre: fila.nombre,
    marca: fila.marca,
    caloriasPor100: aNumero(fila.caloriasPor100),
    proteinasPor100: aNumero(fila.proteinasPor100),
    carbohidratosPor100: aNumero(fila.carbohidratosPor100),
    grasasPor100: aNumero(fila.grasasPor100),
    cafeinaPor100: aNumero(fila.cafeinaPor100),
    descripcion: fila.descripcion,
    unidadBase: fila.unidadBase,
    medidas: medidasDeJson(fila.medidas),
    categoria: categoriaDeFila(fila),
    imagenClave: fila.imagenClave,
  });
}

function categoriaDeFila(fila: FilaAlimento): CategoriaDeAlimento | null {
  if (fila.categoriaPropia) {
    return { ...fila.categoriaPropia, propia: true };
  }
  return fila.categoria ? { ...fila.categoria, propia: false } : null;
}

/** El texto de la búsqueda, comparado en minúsculas. */
function dondeTexto(filtro: FiltroAlimentosPropios | undefined): {
  nombreNormalizado?: { contains: string };
} {
  const t = filtro?.busqueda?.trim().toLowerCase();
  return t ? { nombreNormalizado: { contains: t } } : {};
}

/**
 * El WHERE de un listado o una búsqueda de la lista del consultorio (texto
 * y/o categoría). La categoría se busca en las dos columnas: el id es un
 * UUID, así que el de una propia no puede coincidir con el de una
 * predeterminada.
 */
export function dondeAlimentoPropio(
  filtro?: FiltroAlimentosPropios,
): Prisma.AlimentoPropioWhereInput {
  const id = filtro?.categoriaId;
  return {
    ...dondeTexto(filtro),
    ...(id ? { OR: [{ categoriaId: id }, { categoriaPropiaId: id }] } : {}),
  };
}

/** Lo mismo para el catálogo de la plataforma, que solo tiene predeterminadas. */
export function dondeAlimentoBase(
  filtro?: FiltroAlimentosPropios,
): Prisma.AlimentoBaseWhereInput {
  const id = filtro?.categoriaId;
  return { ...dondeTexto(filtro), ...(id ? { categoriaId: id } : {}) };
}
