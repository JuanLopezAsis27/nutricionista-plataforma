"use client";

import { useState } from "react";
import type {
  GrupoPhantom,
  PuntoPhantom,
} from "@/dominio/servicios/composicionCorporal";
import { formatearNumero } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import type { TemaComposicion } from "./paleta";

const GRUPOS: { clave: GrupoPhantom; etiqueta: string }[] = [
  { clave: "BASICOS", etiqueta: "Básicos" },
  { clave: "DIAMETROS", etiqueta: "Diámetros" },
  { clave: "PERIMETROS", etiqueta: "Perímetros" },
  { clave: "PLIEGUES", etiqueta: "Pliegues" },
];

/** Escala del gráfico: ±4 desvíos cubre prácticamente cualquier medición. */
const LIMITE = 4;

/**
 * Perfil de proporcionalidad Phantom como barras divergentes.
 *
 * Es un dato con polaridad —cada variable está por encima o por debajo del
 * humano de referencia—, así que la codificación es divergente: dos tonos
 * opuestos y el gris del cero en el medio. Las barras arrancan en la línea
 * del cero, no en el borde: es la posición respecto del centro lo que se lee.
 */
export function PerfilPhantom({
  puntos,
  anteriores,
  tema,
}: {
  puntos: PuntoPhantom[];
  /** Perfil de la medición anterior, para marcar de dónde venía cada variable. */
  anteriores?: PuntoPhantom[] | null;
  tema: TemaComposicion;
}) {
  const [grupo, setGrupo] = useState<GrupoPhantom | "TODOS">("TODOS");

  const previos = new Map(
    (anteriores ?? []).map((p) => [p.variable, p.scoreZ]),
  );
  const visibles = puntos.filter((p) => grupo === "TODOS" || p.grupo === grupo);

  if (puntos.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        El perfil Phantom necesita la talla para escalar las medidas.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Desvíos respecto del humano de referencia de 170,18 cm. El{" "}
          <span className="font-medium">0</span> es la proporción media.
        </p>
        <div className="flex flex-wrap gap-1 rounded-md border p-0.5">
          <Button
            variant={grupo === "TODOS" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setGrupo("TODOS")}
          >
            Todos
          </Button>
          {GRUPOS.map((g) => (
            <Button
              key={g.clave}
              variant={grupo === g.clave ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setGrupo(g.clave)}
            >
              {g.etiqueta}
            </Button>
          ))}
        </div>
      </div>

      {/* Regla de referencia, alineada con las barras de abajo. */}
      <div className="flex items-center gap-2 pl-[9.5rem] text-[10px] text-muted-foreground">
        {[-4, -2, 0, 2, 4].map((marca) => (
          <span key={marca} className="flex-1 text-center tabular-nums">
            {marca > 0 ? `+${marca}` : marca}
          </span>
        ))}
      </div>

      <ul className="space-y-1">
        {visibles.map((punto) => (
          <FilaPhantom
            key={punto.variable}
            punto={punto}
            anterior={previos.get(punto.variable) ?? null}
            tema={tema}
          />
        ))}
      </ul>
    </div>
  );
}

function FilaPhantom({
  punto,
  anterior,
  tema,
}: {
  punto: PuntoPhantom;
  anterior: number | null;
  tema: TemaComposicion;
}) {
  const z = Math.max(-LIMITE, Math.min(LIMITE, punto.scoreZ));
  const positivo = z >= 0;
  // La barra ocupa la mitad correspondiente del carril, desde el centro.
  const ancho = (Math.abs(z) / LIMITE) * 50;
  const color = positivo ? tema.sobre : tema.bajo;
  const posicionAnterior =
    anterior != null
      ? 50 + (Math.max(-LIMITE, Math.min(LIMITE, anterior)) / LIMITE) * 50
      : null;

  return (
    <li className="group flex items-center gap-2 text-sm">
      <span
        className="w-[9.5rem] shrink-0 truncate text-xs"
        title={punto.etiqueta}
      >
        {punto.etiqueta}
      </span>
      <div className="relative h-5 flex-1 rounded-sm bg-muted/40">
        {/* Línea del cero: la referencia contra la que se lee todo. */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
          style={{ backgroundColor: tema.eje }}
        />
        <span
          className="absolute inset-y-1 rounded-[3px] transition-all"
          style={{
            backgroundColor: color,
            left: positivo ? "50%" : `${50 - ancho}%`,
            width: `${Math.max(ancho, 0.4)}%`,
          }}
        />
        {posicionAnterior != null && (
          <span
            aria-hidden
            title="Medición anterior"
            className="absolute inset-y-0.5 w-0.5 rounded-full opacity-70"
            style={{
              left: `${posicionAnterior}%`,
              backgroundColor: tema.tintaSuave,
            }}
          />
        )}
      </div>
      <span
        className={cn(
          "w-12 shrink-0 text-right text-xs font-medium tabular-nums",
          Math.abs(punto.scoreZ) >= 2 && "font-bold",
        )}
      >
        {punto.scoreZ > 0 ? "+" : ""}
        {formatearNumero(punto.scoreZ)}
      </span>
      <span className="hidden w-24 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums sm:inline">
        {formatearNumero(punto.valor)}
      </span>
    </li>
  );
}
