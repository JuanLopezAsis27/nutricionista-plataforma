import {
  DEFINICION_FORMATO,
  FORMATOS_PLANIFICACION,
  type DefinicionFormato,
  type FormatoPlanificacion,
} from "@/dominio/entidades/PlanificacionDeportiva";
import type { PerfilDeportivoSalidaDto } from "@/aplicacion/dtos/deportivo.dto";

/**
 * Qué planificación le puede ofrecer la ficha a un paciente según su perfil
 * deportivo (migración 98). La decisión es del deporte —lo configura el
 * SUPERADMIN en la lista—; esto solo la lee del perfil:
 *
 *  - SIN_PERFIL: no cargó perfil deportivo. Se puede planificar igual,
 *    eligiendo la modalidad a mano.
 *  - DISPONIBLE: su deporte tiene planificación; arranca con esa.
 *  - NO_DISPONIBLE: su deporte (fútbol, por ahora) todavía no tiene. La
 *    ficha no ofrece crear ni asignar.
 */
export type PlanificacionSegunPerfil =
  | { estado: "SIN_PERFIL" }
  | {
      estado: "DISPONIBLE";
      deporte: string;
      formato: FormatoPlanificacion;
      definicion: DefinicionFormato;
    }
  | { estado: "NO_DISPONIBLE"; deporte: string };

export function planificacionSegunPerfil(
  perfil: Pick<PerfilDeportivoSalidaDto, "deporte"> | null | undefined,
): PlanificacionSegunPerfil {
  if (!perfil) return { estado: "SIN_PERFIL" };
  const formato = perfil.deporte.formatoPlanificacion;
  if (!formato) {
    return { estado: "NO_DISPONIBLE", deporte: perfil.deporte.nombre };
  }
  return {
    estado: "DISPONIBLE",
    deporte: perfil.deporte.nombre,
    formato,
    definicion: DEFINICION_FORMATO[formato],
  };
}

/** «Running (calle) y Trail running»: las planificaciones que hay hoy. */
export function planificacionesQueHay(): string {
  const etiquetas = FORMATOS_PLANIFICACION.map(
    (f) => DEFINICION_FORMATO[f].etiqueta,
  );
  return etiquetas.length > 1
    ? `${etiquetas.slice(0, -1).join(", ")} y ${etiquetas.at(-1)}`
    : (etiquetas[0] ?? "");
}

/** El aviso para un paciente cuyo deporte todavía no tiene planificación. */
export function textoSinPlanificacion(deporte: string): string {
  return `Su deporte, «${deporte}», todavía no tiene planificación deportiva. Por ahora hay de ${planificacionesQueHay()}.`;
}
