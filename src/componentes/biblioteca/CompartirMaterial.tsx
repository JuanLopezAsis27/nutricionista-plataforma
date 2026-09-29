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
 * Compartir un material con pacientes: selector (de a varios a la vez) o
 * todos los pacientes vigentes de una vez, + lista de asignados (aparece en el
 * portal del paciente como "Mi material").
 *
 * "Todos" lo resuelve el servidor (`compartirConTodos`): el selector es
 * paginado y tildarlos desde acá serían solo los de la primera página.
 */
export function CompartirMaterial({ materialId }: { materialId: string }) {
  const { pacientesAsignados, asignar, compartirConTodos, desasignar } =
    useBiblioteca();
  const { listar } = usePacientes();
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [todos, setTodos] = useState(false);

  const asignados = pacientesAsignados({ id: materialId });
  // Los nombres de la selección salen de la búsqueda; los de los asignados ya
  // vienen resueltos del servidor.
  const pacientes = listar({ pagina: 1, porPagina: 100 });
  const totalPacientes = pacientes.data?.total;

  const nombreDe = (pacienteId: string): string => {
    const paciente = pacientes.data?.pacientes.find((p) => p.id === pacienteId);
    return paciente ? `${paciente.nombre} ${paciente.apellido}` : pacienteId;
  };

  async function compartir() {
    if (todos) {
      await compartirConTodos.mutateAsync({ id: materialId });
      setTodos(false);
      return;
    }
    await Promise.all(
      seleccionados.map((pacienteId) =>
        asignar.mutateAsync({ materialId, pacienteId }),
      ),
    );
    setSeleccionados([]);
  }

  const enviando = asignar.isPending || compartirConTodos.isPending;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={todos}
            onChange={(evento) => setTodos(evento.target.checked)}
          />
          Todos los pacientes
          {totalPacientes != null && (
            <span className="text-muted-foreground">({totalPacientes})</span>
          )}
        </label>
        {todos ? (
          <p className="text-xs text-muted-foreground">
            Se comparte con todos los pacientes activos (los archivados quedan
            afuera). A quien ya lo tenía no se le duplica.
          </p>
        ) : (
          <>
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
          </>
        )}
        <Button
          disabled={(!todos && seleccionados.length === 0) || enviando}
          onClick={compartir}
        >
          {todos ? "Compartir con todos" : "Compartir"}
        </Button>
      </div>

      {asignados.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (asignados.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no compartiste este material con ningún paciente.
        </p>
      ) : (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Compartido con {asignados.data!.length} paciente
            {asignados.data!.length === 1 ? "" : "s"}
          </p>
          <ul className="max-h-72 divide-y overflow-y-auto rounded-md border">
            {asignados.data!.map((paciente) => (
              <li
                key={paciente.id}
                className="flex items-center justify-between p-2 text-sm"
              >
                {paciente.nombre}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Dejar de compartir"
                  disabled={desasignar.isPending}
                  onClick={() =>
                    desasignar.mutate({ materialId, pacienteId: paciente.id })
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
