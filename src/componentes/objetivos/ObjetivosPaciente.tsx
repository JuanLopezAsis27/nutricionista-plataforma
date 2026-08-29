"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { ObjetivoSalidaDto } from "@/aplicacion/dtos/objetivo.dto";
import { useObjetivos } from "@/lib/hooks/useObjetivos";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { FormularioObjetivo } from "./FormularioObjetivo";
import { TarjetaObjetivo } from "./TarjetaObjetivo";

const ORDEN_PRIORIDAD = { ALTA: 0, MEDIA: 1, BAJA: 2 } as const;

/** Pestaña Objetivos de la ficha: en curso primero (por prioridad) + cerrados. */
export function ObjetivosPaciente({ pacienteId }: { pacienteId: string }) {
  const { dePaciente } = useObjetivos();
  const consulta = dePaciente({ pacienteId });
  const [nuevo, setNuevo] = useState(false);

  if (consulta.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const objetivos = consulta.data ?? [];
  const porPrioridad = (a: ObjetivoSalidaDto, b: ObjetivoSalidaDto) =>
    ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad];
  const enCurso = objetivos
    .filter((o) => o.estado === "EN_CURSO")
    .sort(porPrioridad);
  const cerrados = objetivos.filter((o) => o.estado !== "EN_CURSO");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setNuevo(true)}>
          <Plus className="h-4 w-4" />
          Nuevo objetivo
        </Button>
      </div>

      {objetivos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          El paciente todavía no tiene objetivos definidos.
        </p>
      ) : (
        <div className="space-y-4">
          {enCurso.map((objetivo) => (
            <TarjetaObjetivo key={objetivo.id} objetivo={objetivo} />
          ))}
          {cerrados.length > 0 && (
            <>
              <p className="pt-2 text-sm font-medium text-muted-foreground">
                Cumplidos y abandonados
              </p>
              {cerrados.map((objetivo) => (
                <TarjetaObjetivo key={objetivo.id} objetivo={objetivo} />
              ))}
            </>
          )}
        </div>
      )}

      <Dialog open={nuevo} onOpenChange={setNuevo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo objetivo</DialogTitle>
          </DialogHeader>
          <FormularioObjetivo
            pacienteId={pacienteId}
            onTerminado={() => setNuevo(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
