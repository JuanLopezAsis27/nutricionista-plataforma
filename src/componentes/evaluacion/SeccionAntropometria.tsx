"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { MedicionEvolucionDto } from "@/aplicacion/dtos/evaluacion.dto";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { formatearFecha } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { TablaAntropometria } from "./TablaAntropometria";
import { GraficoEvolucion } from "./GraficoEvolucion";
import { FormularioAntropometria } from "./FormularioAntropometria";

/**
 * Antropometría y evolución: la planilla (como el Excel del profesional),
 * los gráficos de evolución y el alta/edición de mediciones.
 */
export function SeccionAntropometria({ pacienteId }: { pacienteId: string }) {
  const { obtenerEvolucion, eliminarAntropometria } = useEvaluacion();
  const evolucion = obtenerEvolucion({ pacienteId });

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<MedicionEvolucionDto | null>(null);
  const [eliminando, setEliminando] = useState<MedicionEvolucionDto | null>(null);

  if (evolucion.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const mediciones = evolucion.data?.mediciones ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Antropometría y evolución</h3>
        <Button
          size="sm"
          onClick={() => {
            setEditando(null);
            setAbierto(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nueva medición
        </Button>
      </div>

      <GraficoEvolucion mediciones={mediciones} />

      <TablaAntropometria
        mediciones={mediciones}
        onEditar={(medicion) => {
          setEditando(medicion);
          setAbierto(true);
        }}
        onEliminar={setEliminando}
      />

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando
                ? `Editar medición del ${formatearFecha(editando.fecha)}`
                : "Nueva medición antropométrica"}
            </DialogTitle>
          </DialogHeader>
          <FormularioAntropometria
            pacienteId={pacienteId}
            medicionInicial={editando}
            onTerminado={() => setAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={eliminando !== null}
        titulo="Eliminar medición"
        descripcion={`¿Eliminar la medición del ${formatearFecha(eliminando?.fecha)}?`}
        cargando={eliminarAntropometria.isPending}
        onConfirmar={() => {
          if (eliminando) {
            eliminarAntropometria.mutate(
              { id: eliminando.id },
              { onSuccess: () => setEliminando(null) },
            );
          }
        }}
        onCancelar={() => setEliminando(null)}
      />
    </div>
  );
}
