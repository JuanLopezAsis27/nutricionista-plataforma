import type {
  NivelDeportivo,
  FaseTemporada,
} from "@/dominio/entidades/PerfilDeportivo";
import type { ImportanciaCompetencia } from "@/dominio/entidades/Competencia";

/**
 * Etiquetas y helpers que comparten el perfil, el calendario y la vista.
 *
 * Los enums viajan en MAYÚSCULAS desde el dominio; estas tablas son lo único
 * que traduce a lo que lee el profesional, y estaban duplicadas de hecho entre
 * los formularios y la vista de solo lectura.
 */

export const ETIQUETA_NIVEL: Record<NivelDeportivo, string> = {
  RECREATIVO: "Recreativo",
  AMATEUR: "Amateur",
  COMPETITIVO: "Competitivo",
  ELITE: "Élite",
};
export const ETIQUETA_FASE: Record<FaseTemporada, string> = {
  PRETEMPORADA: "Pretemporada",
  COMPETENCIA: "Competencia",
  TRANSICION: "Transición",
  DESCANSO: "Descanso",
};
export const ETIQUETA_IMPORTANCIA: Record<ImportanciaCompetencia, string> = {
  A: "A · principal",
  B: "B · secundaria",
  C: "C · preparatoria",
};

export function aNumero(valor: string): number | null {
  const t = valor.trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
