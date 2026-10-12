"use client";

import { useState } from "react";
import { LineChart } from "lucide-react";
import { useConfiguracion } from "@/lib/hooks/useConfiguracion";
import type { EvolucionAntropometria } from "@/dominio/entidades/evolucionesAntropometria";
import { SelectorEvoluciones } from "@/componentes/antropometria/EvolucionMedidas";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";

/**
 * Qué gráficos de evolución ve el paciente en «Mi composición»: el peso, un
 * pliegue o un perímetro puntual, la prensión, los derivados…
 *
 * Es del consultorio y no de cada paciente, como las ecuaciones de grasa. Es
 * presentación, no permiso: las medidas crudas el paciente ya las ve en la
 * planilla de cada consulta. El dashboard del profesional arranca en esta
 * misma lista.
 */
export function FormularioEvolucionesPaciente() {
  const { obtener, guardar } = useConfiguracion();
  const consulta = obtener();
  const config = consulta.data;

  if (consulta.isLoading || !config) {
    return <Skeleton className="h-72 w-full" />;
  }

  // La `key` rearma el editor cuando lo guardado cambia (al guardar, o si
  // otra pestaña lo cambió), sin copiar la config a un estado con un efecto.
  return (
    <EditorEvoluciones
      key={config.evolucionesPaciente.join(",")}
      guardadas={config.evolucionesPaciente}
      guardando={guardar.isPending}
      alGuardar={(evolucionesPaciente) =>
        guardar.mutate({ evolucionesPaciente })
      }
    />
  );
}

function EditorEvoluciones({
  guardadas,
  guardando,
  alGuardar,
}: {
  guardadas: EvolucionAntropometria[];
  guardando: boolean;
  alGuardar: (elegidas: EvolucionAntropometria[]) => void;
}) {
  const [elegidas, setElegidas] = useState(guardadas);

  function alternar(id: EvolucionAntropometria) {
    setElegidas((actuales) =>
      actuales.includes(id)
        ? actuales.filter((elegida) => elegida !== id)
        : [...actuales, id],
    );
  }

  const quedaVacio = elegidas.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChart className="h-5 w-5 text-primary" /> Evoluciones que ve el
          paciente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Elegí qué gráficos de evolución aparecen en «Mi composición» del
          portal. Cada medida va en su propio gráfico, y solo se muestra cuando
          el paciente tiene dos consultas o más con ese dato. Tu dashboard
          arranca en la misma selección.
        </p>

        <SelectorEvoluciones
          elegidas={new Set(elegidas)}
          alAlternar={alternar}
        />

        {quedaVacio && (
          <p className="text-xs text-destructive">
            Tiene que quedar al menos una evolución.
          </p>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={guardando || quedaVacio}
            onClick={() => alGuardar(elegidas)}
          >
            Guardar evoluciones
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
