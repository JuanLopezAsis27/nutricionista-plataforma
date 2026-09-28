import type {
  Prisma,
  CategoriaAlimento as CategoriaFila,
} from "@prisma/client";
import { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";
import type { FiltroAlimentosPropios } from "@/dominio/repositorios/IAlimentoPropioRepositorio";

/**
 * Lo que comparten las dos tablas de alimentos (`alimentos_propios` y
 * `alimentos_base`): tienen las mismas columnas salvo el inquilino, así que la
 * fila se arma y se lee igual. Tenerlo una vez evita que una columna nueva se
 * escriba en una lista y no en la otra.
 */

/** Las columnas comunes de una fila de alimento. */
export interface FilaAlimento {
  id: string;
  nombre: string;
  marca: string | null;
  caloriasPor100: Prisma.Decimal | null;
  proteinasPor100: Prisma.Decimal | null;
  carbohidratosPor100: Prisma.Decimal | null;
  grasasPor100: Prisma.Decimal | null;
  categoria: CategoriaFila | null;
  imagenClave: string | null;
}

/** Decimal nunca cruza infraestructura: se mapea a number. */
function aNumero(valor: Prisma.Decimal | null): number | null {
  return valor === null ? null : valor.toNumber();
}

/** Entidad → columnas a escribir (sin inquilino). */
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
    categoria: p.categoria,
    imagenClave: p.imagenClave,
  };
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
    categoria: fila.categoria,
    imagenClave: fila.imagenClave,
  });
}

/** El WHERE de un listado o una búsqueda (texto y/o categoría). */
export function dondeAlimento(filtro?: FiltroAlimentosPropios): {
  nombreNormalizado?: { contains: string };
  categoria?: CategoriaFila;
} {
  const t = filtro?.busqueda?.trim().toLowerCase();
  return {
    ...(t ? { nombreNormalizado: { contains: t } } : {}),
    ...(filtro?.categoria ? { categoria: filtro.categoria } : {}),
  };
}
