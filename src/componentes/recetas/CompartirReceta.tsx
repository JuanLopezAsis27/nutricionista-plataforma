"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useRecetas } from "@/lib/hooks/useRecetas";
import { usePacientes } from "@/lib/hooks/usePacientes";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { SelectorPaciente } from "@/componentes/pacientes/SelectorPaciente";

/**
 * Compartir una receta con pacientes: selector + lista de asignados
 * (aparece en el portal del paciente como "Mis recetas").
 */
export function CompartirReceta({ recetaId }: { recetaId: string }) {
  const { pacientesAsignados, asignar, desasignar } = useRecetas();
  const { listar } = usePacientes();
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  const asignados = pacientesAsignados({ id: recetaId });
  // Trae una página amplia para resolver nombres de los asignados.
  const pacientes = listar({ pagina: 1, porPagina: 100 });

  const nombreDe = (pacienteId: string): string => {
    const paciente = pacientes.data?.pacientes.find((p) => p.id === pacienteId);
    return paciente ? `${paciente.nombre} ${paciente.apellido}` : pacienteId;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <SelectorPaciente valor={seleccionado} onCambiar={setSeleccionado} />
        </div>
        <Button
          disabled={!seleccionado || asignar.isPending}
          onClick={() => {
            if (!seleccionado) return;
            asignar.mutate(
              { recetaId, pacienteId: seleccionado },
              { onSuccess: () => setSeleccionado(null) },
            );
          }}
        >
          Compartir
        </Button>
      </div>

      {asignados.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (asignados.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no compartiste esta receta con ningún paciente.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {asignados.data!.map((pacienteId) => (
            <li
              key={pacienteId}
              className="flex items-center justify-between p-2 text-sm"
            >
              {nombreDe(pacienteId)}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Dejar de compartir"
                disabled={desasignar.isPending}
                onClick={() => desasignar.mutate({ recetaId, pacienteId })}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
