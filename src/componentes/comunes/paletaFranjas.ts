/**
 * Color de cada franja, en la grilla semanal y en el plan del día.
 *
 * Vive en `comunes/` porque lo usan los DOS planes: el semanal (la grilla del
 * consultorio y la vista por día del paciente) y el nutricional (`VistaPlan`).
 * Son la misma idea de franja —desayuno, almuerzo, cena— y que el almuerzo
 * cambiara de color entre «Mi plan» y «Mi semana» rompería justamente lo que el
 * color hace: orientar sin leer.
 *
 * El color se asigna por la POSICIÓN de la franja, no por su nombre: las
 * franjas son texto libre —un consultorio escribe «Col. AM» y otro «Media
 * mañana»— así que atarlo al nombre dejaría sin color a la mitad de los planes.
 * Por posición, la grilla se lee siempre igual: la primera fila es la de arriba
 * y siempre es del mismo color.
 *
 * El color acompaña, nunca informa solo: cada fila lleva su nombre y su horario
 * escritos. Es cromatismo para orientarse en una tabla de 42 celdas —encontrar
 * «la fila del almuerzo» de un vistazo—, no un dato codificado, así que quien
 * no distinga los tonos no pierde nada.
 *
 * Son clases de Tailwind y no hex porque esto es CROMO de interfaz, no
 * visualización de datos: se apoya en la escala del tema, que ya resuelve claro
 * y oscuro. Los gráficos siguen usando su paleta validada aparte
 * (`componentes/estadisticas/paletaGraficos`).
 */

export interface EstiloFranja {
  /** Rótulo de la fila (la celda de la izquierda). */
  rotulo: string;
  /** Punto de color junto al nombre de la franja. */
  punto: string;
  /** Borde de las celdas de esa fila. */
  celda: string;
  /** Fondo de la comida principal de cada celda. */
  principal: string;
  /** Texto del nombre de la franja. */
  texto: string;
}

/**
 * Seis tonos bien separados en el círculo cromático, en el orden en que suelen
 * cargarse las franjas (desayuno, colación, almuerzo, colación, merienda,
 * cena). A partir de la séptima franja el ciclo vuelve a empezar.
 */
export const PALETA_FRANJAS: EstiloFranja[] = [
  {
    rotulo: "bg-amber-500/10 border-amber-500/30",
    punto: "bg-amber-500",
    celda: "border-amber-500/25",
    principal: "bg-amber-500/10",
    texto: "text-amber-700 dark:text-amber-300",
  },
  {
    rotulo: "bg-rose-500/10 border-rose-500/30",
    punto: "bg-rose-500",
    celda: "border-rose-500/25",
    principal: "bg-rose-500/10",
    texto: "text-rose-700 dark:text-rose-300",
  },
  {
    rotulo: "bg-emerald-500/10 border-emerald-500/30",
    punto: "bg-emerald-500",
    celda: "border-emerald-500/25",
    principal: "bg-emerald-500/10",
    texto: "text-emerald-700 dark:text-emerald-300",
  },
  {
    rotulo: "bg-violet-500/10 border-violet-500/30",
    punto: "bg-violet-500",
    celda: "border-violet-500/25",
    principal: "bg-violet-500/10",
    texto: "text-violet-700 dark:text-violet-300",
  },
  {
    rotulo: "bg-cyan-500/10 border-cyan-500/30",
    punto: "bg-cyan-500",
    celda: "border-cyan-500/25",
    principal: "bg-cyan-500/10",
    texto: "text-cyan-700 dark:text-cyan-300",
  },
  {
    rotulo: "bg-indigo-500/10 border-indigo-500/30",
    punto: "bg-indigo-500",
    celda: "border-indigo-500/25",
    principal: "bg-indigo-500/10",
    texto: "text-indigo-700 dark:text-indigo-300",
  },
];

/** El estilo de la franja que está en esa posición (cicla si hay más de seis). */
export function estiloDeFranja(indice: number): EstiloFranja {
  return PALETA_FRANJAS[indice % PALETA_FRANJAS.length]!;
}

/**
 * Cómo se pinta el total de un día según cómo quedó contra la meta.
 *
 * Verde, ámbar y rojo van SIEMPRE con el número y su signo al lado: el color
 * es lo que hace saltar la fila a la vista, el texto es lo que la explica.
 */
export const COLOR_ESTADO_META = {
  EN_RANGO:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  POR_DEBAJO:
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  POR_ENCIMA: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  SIN_DATO: "bg-muted text-muted-foreground border-transparent",
  SIN_META: "bg-muted text-muted-foreground border-transparent",
} as const;
