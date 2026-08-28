/**
 * Paleta del dashboard de composición corporal.
 *
 * Los cinco colores de las masas son las cinco primeras ranuras categóricas
 * del sistema, EN ESE ORDEN: el orden es el mecanismo de seguridad para
 * daltonismo, no una decisión estética. Reordenar las masas o intercalar un
 * color nuevo invalida la comprobación.
 *
 * Validado con el validador de dataviz contra las superficies reales de las
 * cards (#FFFFFF claro / #1D1D20 oscuro):
 *
 *   claro — banda L, croma, CVD (ΔE 9,1) y visión normal (ΔE 19,6) en PASS;
 *           contraste con WARN en aqua/amarillo/magenta → por eso cada gajo
 *           lleva SIEMPRE etiqueta directa y hay tabla de valores.
 *   oscuro — las seis comprobaciones en PASS.
 */

/** Orden fijo de las masas: es también el orden del donut y de la leyenda. */
export const MASAS = [
  "muscular",
  "adiposa",
  "osea",
  "residual",
  "piel",
] as const;
export type ClaveMasa = (typeof MASAS)[number];

export const ETIQUETAS_MASA: Record<ClaveMasa, string> = {
  muscular: "Muscular",
  adiposa: "Adiposa",
  osea: "Ósea",
  residual: "Residual",
  piel: "Piel",
};

/** Qué representa cada masa, para los tooltips y el pie del donut. */
export const DESCRIPCIONES_MASA: Record<ClaveMasa, string> = {
  muscular: "Músculo esquelético",
  adiposa: "Grasa subcutánea",
  osea: "Huesos (cráneo incluido)",
  residual: "Vísceras, órganos y pulmones",
  piel: "Tegumento",
};

interface Tema {
  masas: Record<ClaveMasa, string>;
  /** Par divergente para los Score-Z: por encima y por debajo del Phantom. */
  sobre: string;
  bajo: string;
  neutro: string;
  /** Estados de la proyección de objetivos (nunca solos: van con ícono). */
  bien: string;
  atencion: string;
  alerta: string;
  tinta: string;
  tintaSuave: string;
  grilla: string;
  eje: string;
  superficie: string;
  borde: string;
  texto: string;
}

export const TEMAS_COMPOSICION: { light: Tema; dark: Tema } = {
  light: {
    masas: {
      muscular: "#2A78D6",
      adiposa: "#EB6834",
      osea: "#1BAF7A",
      residual: "#EDA100",
      piel: "#E87BA4",
    },
    sobre: "#2A78D6",
    bajo: "#E34948",
    neutro: "#F0EFEC",
    bien: "#0CA30C",
    atencion: "#FAB219",
    alerta: "#D03B3B",
    tinta: "#52514E",
    tintaSuave: "#898781",
    grilla: "#E1E0D9",
    eje: "#C3C2B7",
    superficie: "#FFFFFF",
    borde: "rgba(11,11,11,0.10)",
    texto: "#0B0B0B",
  },
  dark: {
    masas: {
      muscular: "#3987E5",
      adiposa: "#D95926",
      osea: "#199E70",
      residual: "#C98500",
      piel: "#D55181",
    },
    sobre: "#3987E5",
    bajo: "#E66767",
    neutro: "#383835",
    bien: "#0CA30C",
    atencion: "#FAB219",
    alerta: "#D03B3B",
    tinta: "#C3C2B7",
    tintaSuave: "#898781",
    grilla: "#2C2C2A",
    eje: "#383835",
    superficie: "#1D1D20",
    borde: "rgba(255,255,255,0.10)",
    texto: "#FFFFFF",
  },
};

export type TemaComposicion = Tema;

/** Estilo compartido de los tooltips de recharts. */
export function estiloTooltip(tema: Tema): React.CSSProperties {
  return {
    backgroundColor: tema.superficie,
    border: `1px solid ${tema.borde}`,
    borderRadius: 8,
    color: tema.texto,
    fontSize: 12,
    boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
  };
}
