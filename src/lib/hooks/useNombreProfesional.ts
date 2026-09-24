"use client";

import { trpc } from "@/lib/trpc";

/**
 * El nombre del profesional de la sesión, tal como lo cargó en Configuración
 * (o el SuperAdmin en el alta). `null` mientras carga o si es un consultorio
 * viejo que nunca lo cargó: cada pantalla decide su respaldo.
 *
 * Sale de la misma query que el formulario de Configuración, así que al
 * guardarlo se refresca solo (las mutaciones invalidan todo).
 */
export function useNombreProfesional(): string | null {
  const consulta = trpc.configuracion.obtener.useQuery();
  return consulta.data?.nombreProfesional?.trim() || null;
}
