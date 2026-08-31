"use client";

import type { MedidasComposicion } from "@/dominio/servicios/composicionCorporal";
import { formatearMedida } from "@/lib/formato";

/**
 * Silueta humana con los sitios de medición marcados sobre el cuerpo.
 *
 * ## Por qué existe
 *
 * La distribución es una pregunta ANATÓMICA —dónde está la grasa, dónde el
 * músculo— y las barras de al lado la contestan como una lista ordenada. Una
 * lista obliga a traducir "subescapular" y "cresta ilíaca" a un lugar del
 * cuerpo antes de poder leer el patrón; la figura lo dice directamente, y de
 * un vistazo se ve si lo cargado está arriba, abajo o en el centro.
 *
 * Sirve además de control de carga: un sitio que no se midió simplemente no
 * tiene punto, así que "no lo tomé" deja de parecerse a "lo tomé y da poco".
 *
 * ## Cómo codifica el valor
 *
 * El TAMAÑO del punto es el aporte del sitio al total —la misma magnitud que
 * muestran las barras, para que las dos lecturas coincidan— y el color es la
 * región, el mismo de la leyenda.
 *
 * El ÁREA del círculo, no el radio, es proporcional al aporte: el ojo compara
 * áreas, y escalar el radio exagera las diferencias al cuadrado.
 *
 * ## Las coordenadas son aproximadas, a propósito
 *
 * Ubican el sitio en la cara correcta del cuerpo y a la altura correcta, no en
 * el punto exacto del protocolo. Es un mapa para leer un reparto, no una guía
 * de palpación: quien mide ya sabe dónde va el plicómetro.
 */

/** Lienzo de UNA silueta. Las dos vistas van lado a lado. */
const ANCHO_SILUETA = 50;
const ALTO = 200;

/** Área del punto más chico y del más grande, en unidades² del lienzo. */
const AREA_MINIMA = 9;
const AREA_MAXIMA = 78;

/** De qué lado del cuerpo se toma el sitio. */
type Vista = "frente" | "espalda";

/**
 * Dónde cae cada sitio, en coordenadas de UNA silueta (0–50 en x).
 *
 * La vista importa: el subescapular y el lumbar son de espalda, el pectoral y
 * el abdominal de frente, y el tricipital y el bicipital están en caras
 * opuestas del mismo brazo. Con una sola vista, la mitad de los puntos se
 * amontonaría contra un borde sin decir de qué lado del cuerpo está.
 */
export const PUNTOS_CUERPO: Partial<
  Record<keyof MedidasComposicion, { x: number; y: number; vista: Vista }>
> = {
  // --- Pliegues del tronco ---
  plieguePectoral: { x: 18, y: 45, vista: "frente" },
  pliegueAxilarMedio: { x: 13, y: 56, vista: "frente" },
  pliegueAbdominal: { x: 30, y: 78, vista: "frente" },
  pliegueSupraespinal: { x: 17, y: 85, vista: "frente" },
  pliegueCrestaIliaca: { x: 12, y: 80, vista: "frente" },
  pliegueSubescapular: { x: 17, y: 50, vista: "espalda" },
  pliegueLumbar: { x: 17, y: 80, vista: "espalda" },
  // --- Pliegues de las extremidades ---
  pliegueBicipital: { x: 7, y: 58, vista: "frente" },
  pliegueTricipital: { x: 7, y: 58, vista: "espalda" },
  pliegueMuslo: { x: 18, y: 115, vista: "frente" },
  plieguePantorrilla: { x: 19, y: 158, vista: "frente" },
  // --- Perímetros: los segmentos musculares ---
  circBrazo: { x: 7, y: 55, vista: "frente" },
  circAntebrazo: { x: 6, y: 82, vista: "frente" },
  circMusloMaximo: { x: 18, y: 110, vista: "frente" },
  circPantorrilla: { x: 19, y: 158, vista: "frente" },
};

export interface MarcaCuerpo {
  campo: keyof MedidasComposicion;
  etiqueta: string;
  /** Aporte al total, en %. Define el tamaño del punto. */
  porcentaje: number;
  valor: number;
  color: string;
}

export function FiguraCuerpo({
  marcas,
  unidad,
  titulo,
}: {
  marcas: MarcaCuerpo[];
  unidad: string;
  /** Descripción accesible de la figura entera. */
  titulo: string;
}) {
  const ubicadas = marcas.filter((m) => PUNTOS_CUERPO[m.campo] != null);
  if (ubicadas.length === 0) return null;

  const mayor = Math.max(...ubicadas.map((m) => m.porcentaje));

  /** Radio tal que el ÁREA sea proporcional al aporte. */
  const radio = (porcentaje: number): number => {
    const fraccion = mayor > 0 ? porcentaje / mayor : 0;
    const area = AREA_MINIMA + fraccion * (AREA_MAXIMA - AREA_MINIMA);
    return Math.sqrt(area / Math.PI);
  };

  // Solo se dibuja la espalda si algún sitio cae ahí: en la distribución
  // muscular todos los segmentos son de frente y la segunda silueta quedaría
  // vacía, ocupando la mitad del ancho para no decir nada.
  const hayEspalda = ubicadas.some(
    (m) => PUNTOS_CUERPO[m.campo]!.vista === "espalda",
  );
  const vistas: Vista[] = hayEspalda ? ["frente", "espalda"] : ["frente"];
  const ancho = ANCHO_SILUETA * vistas.length;

  return (
    <svg
      viewBox={`0 0 ${ancho} ${ALTO}`}
      // Ancho explícito y no `w-full`: la figura vive dentro de un contenedor
      // flex sin ancho propio, donde un 100 % se resuelve contra cero.
      className="h-auto max-w-full text-foreground"
      style={{ width: `${vistas.length * 5.5}rem` }}
      role="img"
      aria-label={titulo}
    >
      {vistas.map((vista, indice) => (
        <g key={vista} transform={`translate(${indice * ANCHO_SILUETA}, 0)`}>
          <Silueta />
          {ubicadas
            .filter((m) => PUNTOS_CUERPO[m.campo]!.vista === vista)
            .map((marca) => {
              const punto = PUNTOS_CUERPO[marca.campo]!;
              return (
                <circle
                  key={marca.campo}
                  cx={punto.x}
                  cy={punto.y}
                  r={radio(marca.porcentaje)}
                  fill={marca.color}
                  fillOpacity={0.7}
                  stroke={marca.color}
                  strokeWidth={0.7}
                >
                  <title>
                    {`${marca.etiqueta}: ${formatearMedida(marca.valor)} ${unidad} · ${formatearMedida(marca.porcentaje)} % del total`}
                  </title>
                </circle>
              );
            })}
          {vistas.length > 1 && (
            <text
              x={ANCHO_SILUETA / 2}
              y={ALTO - 3}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 7 }}
            >
              {vista}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/**
 * La silueta, en su propio espacio de 50 × 200.
 *
 * Es la MISMA forma para las dos vistas a propósito: sirve de mapa de
 * ubicación, y dibujar una espalda anatómicamente distinta agregaría detalle
 * que no cambia dónde cae ningún punto.
 *
 * Pinta con `currentColor` y opacidad baja, así hereda el color del texto y
 * funciona en los dos temas sin necesitar una paleta propia.
 */
function Silueta() {
  return (
    <g
      fill="currentColor"
      fillOpacity={0.07}
      stroke="currentColor"
      strokeOpacity={0.28}
      strokeWidth={0.9}
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Cabeza y cuello */}
      <circle cx={25} cy={15} r={8.5} />
      <path d="M21.5 22 h7 v6 h-7 z" />
      {/* Tronco */}
      <path d="M25 28 C 16 28, 12.5 33, 11.5 43 L 10.5 66 C 9.8 76, 11 86, 13 95 L 37 95 C 39 86, 40.2 76, 39.5 66 L 38.5 43 C 37.5 33, 34 28, 25 28 Z" />
      {/* Brazos */}
      <path d="M11.5 43 C 7.5 46, 5.5 55, 4.5 67 L 3.5 90 C 3.5 94, 6 95, 7.5 92 L 11 72 Z" />
      <path d="M38.5 43 C 42.5 46, 44.5 55, 45.5 67 L 46.5 90 C 46.5 94, 44 95, 42.5 92 L 39 72 Z" />
      {/* Piernas */}
      <path d="M13 95 C 12 112, 13 132, 15 146 L 16.5 176 C 17 181, 22.5 181, 23.5 176 L 24.5 146 C 25 130, 25 112, 25 95 Z" />
      <path d="M37 95 C 38 112, 37 132, 35 146 L 33.5 176 C 33 181, 27.5 181, 26.5 176 L 25.5 146 C 25 130, 25 112, 25 95 Z" />
    </g>
  );
}
