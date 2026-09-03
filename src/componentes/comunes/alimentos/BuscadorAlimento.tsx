"use client";

import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import type { AlimentoNutricionalSalidaDto } from "@/aplicacion/dtos/nutricion.dto";
import { useNutricion } from "@/lib/hooks/useNutricion";
import { Input } from "@/componentes/ui/input";

/**
 * Busca un alimento en el proveedor nutricional y devuelve sus macros por
 * 100 g, para no cargarlas a mano.
 */
export function BuscadorAlimento({
  onElegir,
}: {
  onElegir: (alimento: AlimentoNutricionalSalidaDto) => void;
}) {
  const { buscarAlimento } = useNutricion();
  const [termino, setTermino] = useState("");
  const [debounced, setDebounced] = useState("");
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(termino.trim()), 400);
    return () => clearTimeout(t);
  }, [termino]);

  const habilitado = debounced.length >= 2;
  const consulta = buscarAlimento(
    { termino: debounced, limite: 8 },
    { enabled: habilitado, staleTime: 60_000 },
  );
  const resultados = consulta.data ?? [];

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-md border px-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          value={termino}
          onChange={(e) => {
            setTermino(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          placeholder="Buscar alimento (ej. arroz, pollo, yogur)…"
          className="border-0 px-1 shadow-none focus-visible:ring-0"
        />
        {consulta.isFetching && habilitado && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        )}
      </div>

      {abierto && habilitado && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {resultados.length === 0 && !consulta.isFetching && (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              Sin resultados. Cargá el ingrediente a mano.
            </p>
          )}
          {resultados.map((alimento, i) => (
            <button
              key={`${alimento.referenciaExterna ?? alimento.nombre}-${i}`}
              type="button"
              className="flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                onElegir(alimento);
                setTermino("");
                setDebounced("");
                setAbierto(false);
              }}
            >
              <span className="font-medium">
                {alimento.nombre}
                {alimento.marca ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {alimento.marca}
                  </span>
                ) : null}
              </span>
              <span className="text-xs text-muted-foreground">
                {[
                  alimento.caloriasPor100 != null &&
                    `${alimento.caloriasPor100} kcal`,
                  alimento.proteinasPor100 != null &&
                    `${alimento.proteinasPor100} P`,
                  alimento.carbohidratosPor100 != null &&
                    `${alimento.carbohidratosPor100} C`,
                  alimento.grasasPor100 != null && `${alimento.grasasPor100} G`,
                ]
                  .filter(Boolean)
                  .join(" · ")}{" "}
                (por 100 g)
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
