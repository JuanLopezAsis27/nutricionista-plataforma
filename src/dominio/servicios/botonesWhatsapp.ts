import type { AccionRespuestaRapida } from "../entidades/PlantillaWhatsapp";

/** Acción sobre un turno que puede disparar un botón de respuesta rápida. */
export type AccionSobreTurno = Exclude<AccionRespuestaRapida, "NINGUNA">;

/** Lo que dice el payload de un botón que tocó el paciente. */
export interface BotonTocado {
  accion: AccionSobreTurno;
  turnoId: string;
}

const SEPARADOR = ":";
const ACCIONES: readonly AccionSobreTurno[] = [
  "CONFIRMAR_TURNO",
  "PEDIR_REPROGRAMACION",
];

/**
 * El `payload` que viaja con cada respuesta rápida al enviar la plantilla, y
 * que Meta devuelve tal cual cuando el paciente la toca.
 *
 * Lleva la acción Y el turno: el mismo paciente puede tener dos turnos con
 * recordatorio, y adivinar a cuál contestó por la fecha sería confirmar el
 * equivocado. Los botones sin acción van como `NINGUNA`, que no dispara nada.
 */
export function payloadDeBoton(
  accion: AccionRespuestaRapida,
  turnoId: string | null,
): string {
  if (accion === "NINGUNA" || turnoId == null) return "NINGUNA";
  return `${accion}${SEPARADOR}${turnoId}`;
}

/** Lee el payload de un botón tocado; null si no pide ninguna acción. */
export function leerPayloadDeBoton(
  payload: string | null | undefined,
): BotonTocado | null {
  if (!payload) return null;
  const corte = payload.indexOf(SEPARADOR);
  if (corte <= 0) return null;
  const accion = payload.slice(0, corte) as AccionSobreTurno;
  const turnoId = payload.slice(corte + 1);
  if (!ACCIONES.includes(accion) || turnoId.length === 0) return null;
  return { accion, turnoId };
}
