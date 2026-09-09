"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Images } from "lucide-react";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { formatearFecha } from "@/lib/formato";
import { FotoConVisor } from "@/componentes/comunes/FotoConVisor";
import { SeccionDesplegable } from "@/componentes/comunes/SeccionDesplegable";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";

interface FotoConFecha {
  id: string;
  nombreOriginal: string;
  fecha: Date;
}

/**
 * Antes y después: dos fotos de evoluciones distintas, elegidas por el
 * profesional, una al lado de la otra.
 *
 * Las fotos salen de `obtenerEvoluciones` (la misma consulta que usa
 * `EvolucionesPaciente`, así que no duplica el pedido) aplanadas en una sola
 * línea de tiempo. Por defecto compara la primera contra la última: es la
 * comparación que casi siempre se quiere ver, y el profesional puede elegir
 * cualquier otro par desde los selectores.
 */
export function ComparadorFotosEvolucion({
  pacienteId,
}: {
  pacienteId: string;
}) {
  const { obtenerEvoluciones } = useEvaluacion();
  const evoluciones = obtenerEvoluciones({ pacienteId });

  const fotos: FotoConFecha[] = useMemo(() => {
    const lista = evoluciones.data ?? [];
    // `fecha` es un día sin hora: dos evoluciones del mismo día empatan ahí,
    // y `creadoEn` (cuándo se cargó de verdad la consulta) desempata para que
    // el orden sea siempre el mismo, no el que haya devuelto la consulta.
    return [...lista]
      .sort(
        (a, b) =>
          a.fecha.getTime() - b.fecha.getTime() ||
          a.creadoEn.getTime() - b.creadoEn.getTime(),
      )
      .flatMap((evolucion) =>
        evolucion.fotos.map((foto) => ({
          id: foto.id,
          nombreOriginal: foto.nombreOriginal,
          fecha: evolucion.fecha,
        })),
      );
  }, [evoluciones.data]);

  const [antesId, setAntesId] = useState<string | null>(null);
  const [despuesId, setDespuesId] = useState<string | null>(null);

  const antes = fotos.find((f) => f.id === antesId) ?? fotos[0] ?? null;
  const despues = fotos.find((f) => f.id === despuesId) ?? fotos.at(-1) ?? null;

  const resumen = evoluciones.isLoading
    ? "cargando…"
    : fotos.length === 0
      ? "sin fotos"
      : `${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"}`;

  return (
    <SeccionDesplegable titulo="Fotos: antes y después" resumen={resumen}>
      {evoluciones.isLoading ? null : fotos.length < 2 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Hacen falta al menos dos fotos cargadas en evoluciones distintas para
          poder compararlas.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <SelectorFoto
              etiqueta="Antes"
              fotos={fotos}
              valor={antes?.id ?? null}
              onCambiar={setAntesId}
            />
            <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
            <SelectorFoto
              etiqueta="Después"
              fotos={fotos}
              valor={despues?.id ?? null}
              onCambiar={setDespuesId}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <PanelFoto foto={antes} />
            <PanelFoto foto={despues} />
          </div>
        </div>
      )}
    </SeccionDesplegable>
  );
}

function SelectorFoto({
  etiqueta,
  fotos,
  valor,
  onCambiar,
}: {
  etiqueta: string;
  fotos: FotoConFecha[];
  valor: string | null;
  onCambiar: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {etiqueta}
      </label>
      <Select value={valor ?? undefined} onValueChange={onCambiar}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fotos.map((foto) => (
            <SelectItem key={foto.id} value={foto.id}>
              {etiquetaDeFoto(foto, fotos)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PanelFoto({ foto }: { foto: FotoConFecha | null }) {
  if (!foto) return null;
  return (
    <div className="space-y-1.5">
      <FotoConVisor
        archivoId={foto.id}
        alt={foto.nombreOriginal}
        className="aspect-square w-full border"
      />
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Images className="h-3.5 w-3.5 shrink-0" />
        {formatearFecha(foto.fecha)}
      </p>
    </div>
  );
}

/** "12/03/2026", o "12/03/2026 (foto 2)" cuando esa fecha tiene más de una. */
function etiquetaDeFoto(foto: FotoConFecha, todas: FotoConFecha[]): string {
  const mismaFecha = todas.filter(
    (f) => f.fecha.getTime() === foto.fecha.getTime(),
  );
  if (mismaFecha.length <= 1) return formatearFecha(foto.fecha);
  const indice = mismaFecha.findIndex((f) => f.id === foto.id);
  return `${formatearFecha(foto.fecha)} (foto ${indice + 1})`;
}
