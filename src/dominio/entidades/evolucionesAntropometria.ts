import { CAMPOS_PLANTILLA } from "./PlantillaAntropometrica";

/**
 * Qué se puede seguir en el tiempo en los gráficos de evolución de la
 * antropometría, además del % graso y las masas (que tienen los suyos).
 *
 * Son los ids que guarda la configuración del consultorio
 * (`evolucionesPaciente`): por eso viven en el dominio y no en la pantalla.
 * Cada medida cruda va sola —un pliegue o un perímetro puntual—, y además los
 * derivados que el profesional sigue (IMC, Σ de pliegues, masas de Kerr, kg
 * bajados). La única que agrupa dos es la prensión: derecha e izquierda se
 * leen juntas.
 *
 * El orden es el del selector y el de los paneles. Se pueden agregar ids; si
 * se saca uno, `normalizarEvoluciones` lo descarta de lo guardado al leer.
 */
export const EVOLUCIONES_ANTROPOMETRIA = [
  "pesoKg",
  "kgBajadosAcumulados",
  "imc",
  "indiceCinturaCadera",
  "sumatoria6Pliegues",
  "sumatoria8Pliegues",
  "masaMuscularKg",
  "masaAdiposaKg",
  "fuerzaPrension",
  ...CAMPOS_PLANTILLA,
] as const;

export type EvolucionAntropometria = (typeof EVOLUCIONES_ANTROPOMETRIA)[number];

/** Lo que ve el paciente mientras el consultorio no elija otra cosa. */
export const EVOLUCIONES_PACIENTE_POR_DEFECTO: readonly EvolucionAntropometria[] =
  ["pesoKg", "circCinturaMinima", "fuerzaPrension"];

export function esEvolucionAntropometria(
  id: string,
): id is EvolucionAntropometria {
  return (EVOLUCIONES_ANTROPOMETRIA as readonly string[]).includes(id);
}

/** En el orden del catálogo, sin repetidos ni ids que ya no existen. */
export function normalizarEvoluciones(
  ids: readonly string[],
): EvolucionAntropometria[] {
  return EVOLUCIONES_ANTROPOMETRIA.filter((id) => ids.includes(id));
}
