import { cn } from "@/lib/utilidades";

/** El coral de la marca, el mismo de `assets/marca/marca.svg`. */
const CORAL = "#F4535E";

/**
 * El isotipo de la app —anillo, manzana y pesa—, SIN el fondo oscuro del
 * ícono de la PWA. Es el dibujo de `assets/marca/marca.svg`, la misma fuente
 * de la que `scripts/generar-iconos-pwa.mjs` saca los PNG del teléfono: si la
 * marca cambia allá, hay que copiar los trazos acá.
 *
 * La tinta que en el SVG es blanca (el anillo fino y la pesa) va en
 * `currentColor`: el blanco solo funciona sobre el fondo oscuro del ícono, y
 * acá el fondo es el de la pantalla. Así se ve oscura en el tema claro y
 * blanca en el oscuro; el coral queda fijo.
 *
 * Va inline y no como archivo: no depende de la red, y la pantalla «sin
 * conexión» también lo muestra.
 */
export function IsotipoNutriOffice({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("h-8 w-8 shrink-0 text-foreground", className)}
    >
      <g fill="none" stroke="currentColor" strokeWidth="2.04">
        <path d="M12.92 21.42A21.82 21.82 0 0 1 51.08 21.42" />
        <path d="M51.08 42.58A21.82 21.82 0 0 1 12.92 42.58" />
      </g>
      <circle
        cx="32"
        cy="32"
        r="17.68"
        fill="none"
        stroke={CORAL}
        strokeWidth="4.09"
      />
      <g fill={CORAL}>
        <path d="M31.7 29.6c-1.2-1.7-2.8-2.3-4.7-2.3-3.1 0-4.9 3-4.9 7.3 0 5.8 3.9 10.7 9.6 10.7s9.6-4.9 9.6-10.7c0-4.3-1.8-7.3-4.9-7.3-1.9 0-3.5.6-4.7 2.3Z" />
        <path d="M30.6 24.4c1-3.6 4.4-5.6 9-5.4-.7 3.7-4.2 5.9-9 5.4Z" />
        <path
          d="M31.3 29.2c-.9-2.6-1.4-4.4-1.7-5.8"
          fill="none"
          stroke={CORAL}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
      <g fill="currentColor">
        <rect x="14.43" y="30.17" width="6.44" height="3.66" rx="0.6" />
        <rect x="43.13" y="30.17" width="6.44" height="3.66" rx="0.6" />
        <rect x="10.05" y="21.40" width="3.8" height="21.2" rx="1.3" />
        <rect x="50.15" y="21.40" width="3.8" height="21.2" rx="1.3" />
        <rect x="5.66" y="22.95" width="3.81" height="18.1" rx="1.3" />
        <rect x="54.53" y="22.95" width="3.81" height="18.1" rx="1.3" />
        <rect x="1.86" y="27.61" width="3.22" height="8.78" rx="1.3" />
        <rect x="58.92" y="27.61" width="3.22" height="8.78" rx="1.3" />
      </g>
    </svg>
  );
}

/** «NutriOffice», con «Office» en el coral de la marca. */
export function NombreNutriOffice({ className }: { className?: string }) {
  return (
    <span className={className}>
      Nutri<span className="text-primary">Office</span>
    </span>
  );
}
