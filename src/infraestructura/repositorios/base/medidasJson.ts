import type { Prisma } from "@prisma/client";
import type { MedidaAlimento } from "@/dominio/entidades/medidasAlimento";

/**
 * Las medidas caseras se guardan como JSON (`[{ nombre, cantidad }]`,
 * migración 90), en el alimento y en cada copia donde se lo usa. La columna
 * no tiene esquema en la base, así que se lee a la defensiva: lo que no tenga
 * la forma esperada se descarta en vez de romper la lectura de un plan.
 */
export function medidasDeJson(valor: Prisma.JsonValue): MedidaAlimento[] {
  if (!Array.isArray(valor)) return [];
  const medidas: MedidaAlimento[] = [];
  for (const elemento of valor) {
    if (
      elemento === null ||
      typeof elemento !== "object" ||
      Array.isArray(elemento)
    ) {
      continue;
    }
    const { nombre, cantidad } = elemento as Record<string, unknown>;
    if (
      typeof nombre === "string" &&
      typeof cantidad === "number" &&
      cantidad > 0
    ) {
      medidas.push({ nombre, cantidad });
    }
  }
  return medidas;
}

/** Medidas → valor a escribir en la columna JSON. */
export function medidasAJson(
  medidas: ReadonlyArray<MedidaAlimento>,
): Prisma.InputJsonValue {
  return medidas.map((m) => ({ nombre: m.nombre, cantidad: m.cantidad }));
}

/** Decimal → number (nunca cruza infraestructura). */
function aNumero(valor: Prisma.Decimal | null): number | null {
  return valor === null ? null : valor.toNumber();
}

/** Las columnas de cantidad de una copia de alimento (opción, ingrediente, comida). */
export interface FilaCantidadAlimento {
  cantidadGramos: Prisma.Decimal | null;
  unidadBase: "GRAMO" | "MILILITRO";
  medidas: Prisma.JsonValue;
  medida: string | null;
  cantidadMedida: Prisma.Decimal | null;
  cantidadPorMedida: Prisma.Decimal | null;
}

/** Fila → cantidad del dominio. */
export function cantidadDeFila(fila: FilaCantidadAlimento) {
  return {
    cantidadGramos: aNumero(fila.cantidadGramos),
    unidadBase: fila.unidadBase,
    medidas: medidasDeJson(fila.medidas),
    medida: fila.medida,
    cantidadMedida: aNumero(fila.cantidadMedida),
    cantidadPorMedida: aNumero(fila.cantidadPorMedida),
  };
}

/** Cantidad del dominio → columnas a escribir. */
export function columnasDeCantidad(cantidad: {
  cantidadGramos: number | null;
  unidadBase: "GRAMO" | "MILILITRO";
  medidas: ReadonlyArray<MedidaAlimento>;
  medida: string | null;
  cantidadMedida: number | null;
  cantidadPorMedida: number | null;
}) {
  return {
    cantidadGramos: cantidad.cantidadGramos,
    unidadBase: cantidad.unidadBase,
    medidas: medidasAJson(cantidad.medidas),
    medida: cantidad.medida,
    cantidadMedida: cantidad.cantidadMedida,
    cantidadPorMedida: cantidad.cantidadPorMedida,
  };
}
