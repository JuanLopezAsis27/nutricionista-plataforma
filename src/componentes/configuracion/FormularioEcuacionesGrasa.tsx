"use client";

import { useEffect, useState } from "react";
import { Percent } from "lucide-react";
import { useConfiguracion } from "@/lib/hooks/useConfiguracion";
import {
  DEFINICIONES_METODO,
  METODOS_GRASA,
  type MetodoGrasa,
} from "@/dominio/servicios/grasaPorPliegues";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";

/**
 * Qué ecuaciones de grasa por pliegues se muestran, en el dashboard del
 * profesional, el PDF y la vista del paciente. Una ecuación destildada se
 * oculta en todas partes, incluso en mediciones viejas que ya la tenían
 * calculada: no queda a mitad de camino.
 */
export function FormularioEcuacionesGrasa() {
  const { obtener, guardar } = useConfiguracion();
  const consulta = obtener();
  const config = consulta.data;

  const [visibles, setVisibles] = useState<MetodoGrasa[]>([...METODOS_GRASA]);

  useEffect(() => {
    if (!config) return;
    setVisibles(config.formulasGrasaVisibles);
  }, [config]);

  if (consulta.isLoading || !config) {
    return <Skeleton className="h-72 w-full" />;
  }

  function alternar(metodo: MetodoGrasa, activo: boolean) {
    setVisibles((actuales) =>
      activo ? [...actuales, metodo] : actuales.filter((m) => m !== metodo),
    );
  }

  const quedaVacio = visibles.length === 0;

  function onGuardar() {
    if (quedaVacio) return;
    guardar.mutate({ formulasGrasaVisibles: visibles });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Percent className="h-5 w-5 text-primary" /> Ecuaciones de grasa por
          pliegues
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Elegí qué ecuaciones se calculan y se muestran en el dashboard, el PDF
          y la vista del paciente. Las que destildes desaparecen de todas
          partes, incluso de mediciones viejas que ya las tenían calculadas.
        </p>

        <div className="space-y-2.5">
          {METODOS_GRASA.map((metodo) => (
            <Casilla
              key={metodo}
              etiqueta={DEFINICIONES_METODO[metodo].etiqueta}
              descripcion={DEFINICIONES_METODO[metodo].poblacion}
              activo={visibles.includes(metodo)}
              onCambio={(activo) => alternar(metodo, activo)}
            />
          ))}
        </div>

        {quedaVacio && (
          <p className="text-xs text-destructive">
            Tiene que quedar al menos una ecuación visible.
          </p>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={guardar.isPending || quedaVacio}
            onClick={onGuardar}
          >
            Guardar ecuaciones
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Casilla({
  etiqueta,
  descripcion,
  activo,
  onCambio,
}: {
  etiqueta: string;
  descripcion: string;
  activo: boolean;
  onCambio: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-primary"
        checked={activo}
        onChange={(e) => onCambio(e.target.checked)}
      />
      <span>
        {etiqueta}
        <span className="block text-xs text-muted-foreground">
          {descripcion}
        </span>
      </span>
    </label>
  );
}
