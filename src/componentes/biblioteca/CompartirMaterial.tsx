"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useBiblioteca } from "@/lib/hooks/useBiblioteca";
import { usePacientes } from "@/lib/hooks/usePacientes";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import { SelectorPacientesMultiple } from "@/componentes/pacientes/SelectorPacientesMultiple";

/**
 * Compartir un material con pacientes: selector (de a varios a la vez) + lista
 * de asignados (aparece en el portal del paciente como "Mi material").
 */
export function CompartirMaterial({ materialId }: { materialId: string }) {
  const { pacientesAsignados, asignar, desasignar } = useBiblioteca();
  const { listar } = usePacientes();
  const [seleccionados, setSeleccionados] = useState<string[]>([]);

  const asignados = pacientesAsignados({ id: materialId });
  // Trae una página amplia para resolver nombres de los asignados.
  const pacientes = listar({ pagina: 1, porPagina: 100 });

  const nombreDe = (pacienteId: string): string => {
    const paciente = pacientes.data?.pacientes.find((p) => p.id === pacienteId);
    return paciente ? `${paciente.nombre} ${paciente.apellido}` : pacienteId;
  };

  async function compartir() {
    await Promise.all(
      seleccionados.map((pacienteId) =>
        asignar.mutateAsync({ materialId, pacienteId }),
      ),
    );
    setSeleccionados([]);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SelectorPacientesMultiple
          valores={seleccionados}
          onCambiar={setSeleccionados}
        />
        {seleccionados.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {seleccionados.map((pacienteId) => (
              <Badge
                key={pacienteId}
                variant="secondary"
                className="gap-1 pr-1"
              >
                {nombreDe(pacienteId)}
                <button
                  type="button"
                  aria-label="Quitar de la selección"
                  onClick={() =>
                    setSeleccionados((actual) =>
                      actual.filter((id) => id !== pacienteId),
                    )
                  }
                  className="rounded-full p-0.5 hover:bg-background/60"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <Button
          disabled={seleccionados.length === 0 || asignar.isPending}
          onClick={compartir}
        >
          Compartir
        </Button>
      </div>

      {asignados.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (asignados.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no compartiste este material con ningún paciente.
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
                onClick={() => desasignar.mutate({ materialId, pacienteId })}
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
