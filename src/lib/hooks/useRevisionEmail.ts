"use client";

import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/lib/hooks/useDebounce";
import type { RevisionEmailSalidaDto } from "@/aplicacion/dtos/acceso-portal.dto";

const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Qué implica el email que se está escribiendo en la ficha de un paciente:
 * si ya lo tiene otra ficha y si sirve para entrar al portal (ver
 * `RevisarEmailPaciente`).
 *
 * Espera a que se deje de tipear y a que tenga forma de email. El aviso y los
 * campos de acceso lo piden con los mismos argumentos, así que es una sola
 * consulta. `undefined` mientras no haya respuesta.
 */
export function useRevisionEmail(
  email: string | undefined,
  pacienteId?: string,
): RevisionEmailSalidaDto | undefined {
  const normalizado = useDebounce((email ?? "").trim().toLowerCase(), 400);
  const valido = PATRON_EMAIL.test(normalizado);
  const consulta = trpc.accesoPortal.revisarEmail.useQuery(
    { email: normalizado, pacienteId },
    { enabled: valido, staleTime: 30_000 },
  );
  return valido ? consulta.data : undefined;
}
