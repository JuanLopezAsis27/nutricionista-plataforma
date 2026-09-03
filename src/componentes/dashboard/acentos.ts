/**
 * Acentos de color del panel principal.
 *
 * Cada bloque del dashboard tiene su color y lo conserva: la tarjeta de turnos
 * es siempre azul y la de pacientes siempre verde, así el ojo encuentra el
 * número que busca sin leer los rótulos. Es orientación, no información —cada
 * tarjeta dice qué mide con todas las letras—, así que nada se pierde si el
 * color no se distingue.
 *
 * Son clases de Tailwind y no hex porque esto es cromo de interfaz: se apoya en
 * la escala del tema, que ya resuelve claro y oscuro. Los gráficos siguen
 * usando su paleta validada aparte (`componentes/estadisticas/paletaGraficos`).
 */

export interface Acento {
  /** Cuadrito donde va el ícono. */
  chip: string;
  /** Color del ícono y de los números destacados. */
  tinta: string;
  /** Barra superior de la tarjeta. */
  barra: string;
}

export const ACENTOS = {
  verde: {
    chip: "bg-emerald-500/10",
    tinta: "text-emerald-600 dark:text-emerald-400",
    barra: "bg-emerald-500",
  },
  azul: {
    chip: "bg-sky-500/10",
    tinta: "text-sky-600 dark:text-sky-400",
    barra: "bg-sky-500",
  },
  violeta: {
    chip: "bg-violet-500/10",
    tinta: "text-violet-600 dark:text-violet-400",
    barra: "bg-violet-500",
  },
  ambar: {
    chip: "bg-amber-500/10",
    tinta: "text-amber-600 dark:text-amber-400",
    barra: "bg-amber-500",
  },
  rosa: {
    chip: "bg-rose-500/10",
    tinta: "text-rose-600 dark:text-rose-400",
    barra: "bg-rose-500",
  },
} as const satisfies Record<string, Acento>;

export type ClaveAcento = keyof typeof ACENTOS;
