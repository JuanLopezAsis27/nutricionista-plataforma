"use client";

/**
 * Silueta partida al medio: la mitad izquierda es el tejido adiposo y la
 * derecha el muscular.
 *
 * ## Por qué una figura y no dos columnas de números
 *
 * Los dos repartos son ANATÓMICOS —dónde está la grasa, dónde el músculo— y en
 * una tabla obligan a traducir «superior» o «pierna» a un lugar del cuerpo
 * antes de poder leerlos. Partida al medio, la figura hace de leyenda: el
 * color de cada mitad es el mismo con el que el resto del dashboard pinta esa
 * masa, así que el bloque de porcentajes de cada lado se lee sin cabecera.
 *
 * No lleva marcas por sitio: las zonas son regiones, no puntos, y un punto
 * sobre el cuerpo prometería una precisión de palpación que este reparto no
 * tiene. La silueta es un mapa de lectura.
 *
 * ## Accesibilidad
 *
 * El color no es el único canal: cada mitad lleva su rótulo al lado y la
 * figura entera se describe con `aria-label`. Se dibuja con `aria-hidden` en
 * las partes decorativas para que el lector de pantalla lea una sola vez.
 */

const ANCHO = 50;
const ALTO = 200;

export function FiguraTejidos({
  colorAdiposo,
  colorMuscular,
}: {
  colorAdiposo: string;
  colorMuscular: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      // Ancho explícito y no `w-full`: la figura vive dentro de un contenedor
      // flex sin ancho propio, donde un 100 % se resuelve contra cero.
      className="h-auto max-w-full"
      style={{ width: "5rem" }}
      role="img"
      aria-label="Silueta partida al medio: la mitad izquierda representa el tejido adiposo y la derecha el tejido muscular."
    >
      <defs>
        {/* Cada mitad se pinta recortando la MISMA silueta: así las dos
            mitades encajan sin costura aunque cambie el dibujo del cuerpo. */}
        <clipPath id="mitad-izquierda">
          <rect x={0} y={0} width={ANCHO / 2} height={ALTO} />
        </clipPath>
        <clipPath id="mitad-derecha">
          <rect x={ANCHO / 2} y={0} width={ANCHO / 2} height={ALTO} />
        </clipPath>
      </defs>

      <g clipPath="url(#mitad-izquierda)" aria-hidden>
        <Silueta color={colorAdiposo} />
      </g>
      <g clipPath="url(#mitad-derecha)" aria-hidden>
        <Silueta color={colorMuscular} />
      </g>
    </svg>
  );
}

/** La silueta, en su propio espacio de 50 × 200. */
function Silueta({ color }: { color: string }) {
  return (
    <g fill={color} fillOpacity={0.9}>
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
