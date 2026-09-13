"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useConfiguracion } from "@/lib/hooks/useConfiguracion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";

/**
 * Análisis automático de fotos de comida en el diario del paciente.
 *
 * Prendido, cada foto que el paciente sube se manda a analizar con IA y
 * completa descripción y porción solas; apagado, la foto se sube y nada más.
 * Consume la misma cuota de IA que el Asistente del paciente, por eso arranca
 * apagado y es el nutricionista quien decide activarlo.
 */
export function FormularioDiarioIA() {
  const { obtener, guardar } = useConfiguracion();
  const consulta = obtener();
  const config = consulta.data;

  const [activo, setActivo] = useState(false);

  useEffect(() => {
    if (!config) return;
    setActivo(config.analisisFotoComidaAutomatico);
  }, [config]);

  if (consulta.isLoading || !config) {
    return <Skeleton className="h-48 w-full" />;
  }

  function onGuardar() {
    guardar.mutate({ analisisFotoComidaAutomatico: activo });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-primary" /> Diario del paciente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-primary"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
          />
          <span>
            Analizar automáticamente las fotos de comida con IA
            <span className="block text-xs text-muted-foreground">
              Al subir una foto en el diario, se completa sola la descripción y
              la porción estimada (el paciente igual puede editarlas antes de
              guardar). Cada foto analizada consume cuota de IA del consultorio,
              la misma que usa el Asistente. Apagado, la foto se sube igual,
              pero sin analizarse.
            </span>
          </span>
        </label>

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={guardar.isPending}
            onClick={onGuardar}
          >
            Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
