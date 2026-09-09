/**
 * Paleta de los gráficos del consultorio.
 *
 * Categórica de 2 series, validada con el validador de dataviz contra las
 * superficies de card (#FFFFFF claro / #1D1D20 oscuro): las 6 comprobaciones
 * en PASS.
 *
 * Vive en su propio módulo desde que hay más de un gráfico: la validación es
 * de la PALETA, no del componente, y una segunda copia de estos hex se
 * desalinea en cuanto alguien ajusta uno solo de los dos gráficos.
 */
export const TEMAS_GRAFICO = {
  light: {
    total: "#2A78D6",
    completados: "#F4535E",
    tinta: "#52514E",
    grilla: "#E1E0D9",
    fondoTooltip: "#FFFFFF",
    bordeTooltip: "rgba(11,11,11,0.10)",
    texto: "#0B0B0B",
  },
  dark: {
    total: "#3987E5",
    completados: "#EF4E59",
    tinta: "#C3C2B7",
    grilla: "#2C2C2A",
    fondoTooltip: "#1D1D20",
    bordeTooltip: "rgba(255,255,255,0.10)",
    texto: "#FFFFFF",
  },
} as const;

export type TemaGrafico = (typeof TEMAS_GRAFICO)["light"];
