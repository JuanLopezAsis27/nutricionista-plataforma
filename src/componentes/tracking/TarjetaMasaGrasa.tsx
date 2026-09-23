"use client";

import { useState } from "react";
import { Droplets } from "lucide-react";
import { DEFINICIONES_METODO } from "@/dominio/servicios/grasaPorPliegues";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { formatearNumero } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { LineaDeTiempo } from "@/componentes/comunes/LineaDeTiempo";
import { useTemaComposicion } from "@/componentes/antropometria/useTemaComposicion";
import {
  ecuacionesDeLaSerie,
  ecuacionFavorita,
} from "@/componentes/antropometria/SelectorEcuacion";

/** De dónde sale la masa grasa que se está mirando. */
type FuenteGrasa = "ANTROPOMETRIA" | "BIOIMPEDANCIA";

const FUENTES: { valor: FuenteGrasa; etiqueta: string }[] = [
  { valor: "ANTROPOMETRIA", etiqueta: "Antropometría" },
  { valor: "BIOIMPEDANCIA", etiqueta: "Bioimpedancia" },
];

/**
 * La evolución de la masa grasa (kg) en el período elegido de Progreso.
 *
 * Una fuente por vez, como el peso: la masa grasa de una ecuación de pliegues
 * y la de la balanza de bioimpedancia son números de métodos distintos, y una
 * sola curva que pasara de una a otra dibujaría saltos que no son del
 * paciente. Predeterminada, la antropometría.
 *
 * De la antropometría se toma UNA ecuación para toda la serie —la favorita
 * del profesional (`ecuacionFavorita`), la misma que abre el dashboard de
 * Antropometría—, por lo mismo: una serie que cambia de ecuación a mitad de
 * camino mide el cambio de fórmula.
 *
 * Lee las mismas consultas que las pestañas Antropometría y Bioimpedancia, así
 * que no pide nada nuevo al servidor: React Query las comparte.
 */
export function TarjetaMasaGrasa({
  pacienteId,
  desde,
  hasta,
}: {
  pacienteId: string;
  desde: Date;
  hasta: Date;
}) {
  const { obtenerComposicion, obtenerBioimpedancia } = useEvaluacion();
  const composicion = obtenerComposicion({ pacienteId });
  const bioimpedancia = obtenerBioimpedancia({ pacienteId });
  const { tema, montado } = useTemaComposicion();
  const [fuente, setFuente] = useState<FuenteGrasa>("ANTROPOMETRIA");

  const cargando = composicion.isLoading || bioimpedancia.isLoading;
  const enPeriodo = (fecha: Date): boolean => {
    const t = new Date(fecha).getTime();
    return t >= desde.getTime() && t <= hasta.getTime();
  };

  // Antropometría: la ecuación favorita, elegida sobre TODA la historia (no
  // solo el período) para que cambiar de período no cambie de ecuación.
  const mediciones = composicion.data?.mediciones ?? [];
  const metodo = ecuacionFavorita(mediciones, ecuacionesDeLaSerie(mediciones));
  const puntosAntropometria = mediciones
    .filter((m) => enPeriodo(m.fecha))
    .flatMap((m) => {
      const kg = m.resultado.grasaPorPliegues.resultados.find(
        (r) => r.metodo === metodo,
      )?.masaGrasaKg;
      return kg != null ? [{ fecha: m.fecha, valor: kg }] : [];
    });

  const puntosBioimpedancia = (bioimpedancia.data?.mediciones ?? [])
    .filter((m) => enPeriodo(m.fecha) && m.masaGrasaKg != null)
    .map((m) => ({ fecha: m.fecha, valor: m.masaGrasaKg! }));

  const esAntropometria = fuente === "ANTROPOMETRIA";
  const puntos = esAntropometria ? puntosAntropometria : puntosBioimpedancia;
  const variacion =
    puntos.length >= 2
      ? Math.round((puntos[puntos.length - 1]!.valor - puntos[0]!.valor) * 10) /
        10
      : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-3 border-b bg-orange-500/5 p-4">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
              <Droplets className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </span>
            Masa grasa
          </span>
          {variacion != null && (
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                variacion <= 0 ? "text-primary" : "text-muted-foreground",
              )}
            >
              {variacion > 0 ? "+" : ""}
              {formatearNumero(variacion)} kg
            </span>
          )}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex rounded-lg border bg-card p-1"
            role="group"
            aria-label="Fuente de la masa grasa"
          >
            {FUENTES.map((f) => (
              <button
                key={f.valor}
                type="button"
                aria-pressed={f.valor === fuente}
                onClick={() => setFuente(f.valor)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  f.valor === fuente
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.etiqueta}
              </button>
            ))}
          </div>
          {esAntropometria && metodo && (
            <span className="text-xs text-muted-foreground">
              Ecuación: {DEFINICIONES_METODO[metodo].etiqueta}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="py-4 pl-0 pr-3">
        {cargando || !montado ? (
          <Skeleton className="mx-4 h-40" />
        ) : puntos.length < 2 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            {puntos.length === 0
              ? esAntropometria
                ? "No hay mediciones antropométricas con masa grasa en este período."
                : "No hay bioimpedancias con masa grasa en este período."
              : "Con dos o más mediciones de esta fuente vas a ver la curva de evolución."}
          </p>
        ) : (
          <LineaDeTiempo
            puntos={puntos}
            unidad="kg"
            nombre="Masa grasa"
            alto={200}
            colores={{
              // El color de la masa adiposa del dashboard de composición: el
              // mismo tejido se lee con el mismo color en toda la ficha.
              linea: tema.masas.adiposa,
              grilla: tema.grilla,
              tinta: tema.tinta,
              eje: tema.eje,
              superficie: tema.superficie,
              borde: tema.borde,
              texto: tema.texto,
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
