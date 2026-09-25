"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { MedicionBioimpedanciaDto } from "@/aplicacion/dtos/bioimpedancia.dto";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { formatearFecha, formatearMedida } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/componentes/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { DashboardBioimpedancia } from "./DashboardBioimpedancia";
import { FormularioBioimpedancia } from "./FormularioBioimpedancia";
import { ObjetivosBioimpedancia } from "./ObjetivosBioimpedancia";

/**
 * Pestaña de Bioimpedancia del paciente: lo que informa la balanza, consulta
 * por consulta. Mismas tres vistas que la antropometría —dashboard,
 * mediciones y objetivos— sobre otra fuente, que no se mezcla con aquella.
 */
export function SeccionBioimpedancia({ pacienteId }: { pacienteId: string }) {
  const { obtenerBioimpedancia, eliminarBioimpedancia } = useEvaluacion();
  const seguimiento = obtenerBioimpedancia({ pacienteId });

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<MedicionBioimpedanciaDto | null>(
    null,
  );
  const [eliminando, setEliminando] = useState<MedicionBioimpedanciaDto | null>(
    null,
  );

  if (seguimiento.isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }
  if (seguimiento.isError || !seguimiento.data) {
    return (
      <p className="text-sm text-destructive">
        No se pudo cargar la bioimpedancia del paciente.
      </p>
    );
  }

  const { mediciones, objetivos, valoresActuales } = seguimiento.data;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="dashboard">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="mediciones">
              Mediciones
              {mediciones.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {mediciones.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="objetivos">
              Objetivos
              {objetivos.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {objetivos.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
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

        <TabsContent value="dashboard" className="mt-4">
          <DashboardBioimpedancia mediciones={mediciones} />
        </TabsContent>

        <TabsContent value="mediciones" className="mt-4">
          <TablaMediciones
            mediciones={mediciones}
            onEditar={(medicion) => {
              setEditando(medicion);
              setAbierto(true);
            }}
            onEliminar={setEliminando}
          />
        </TabsContent>

        <TabsContent value="objetivos" className="mt-4">
          <ObjetivosBioimpedancia
            pacienteId={pacienteId}
            objetivos={objetivos}
            valoresActuales={valoresActuales}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando
                ? `Editar bioimpedancia del ${formatearFecha(editando.fecha)}`
                : "Nueva medición de bioimpedancia"}
            </DialogTitle>
          </DialogHeader>
          {/* Se monta de nuevo en cada apertura: react-hook-form toma los
              valores iniciales una sola vez. */}
          {abierto && (
            <FormularioBioimpedancia
              pacienteId={pacienteId}
              medicionInicial={editando}
              onTerminado={() => setAbierto(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={eliminando !== null}
        titulo="Eliminar medición"
        descripcion={`¿Eliminar la bioimpedancia del ${formatearFecha(eliminando?.fecha)}?`}
        cargando={eliminarBioimpedancia.isPending}
        onConfirmar={() => {
          if (eliminando) {
            eliminarBioimpedancia.mutate(
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

/**
 * Los números crudos, de la más nueva a la más vieja. Es además la vista en
 * tabla de los gráficos del dashboard: el dato no depende del color.
 */
function TablaMediciones({
  mediciones,
  onEditar,
  onEliminar,
}: {
  mediciones: MedicionBioimpedanciaDto[];
  onEditar: (medicion: MedicionBioimpedanciaDto) => void;
  onEliminar: (medicion: MedicionBioimpedanciaDto) => void;
}) {
  if (mediciones.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Todavía no hay mediciones de bioimpedancia.
      </p>
    );
  }

  const columnas: {
    titulo: string;
    valor: (m: MedicionBioimpedanciaDto) => number | null;
  }[] = [
    { titulo: "Peso (kg)", valor: (m) => m.pesoKg },
    { titulo: "Músculo (kg)", valor: (m) => m.masaMuscularKg },
    { titulo: "Músculo (%)", valor: (m) => m.porcentajeMuscular },
    { titulo: "Grasa (kg)", valor: (m) => m.masaGrasaKg },
    { titulo: "Grasa (%)", valor: (m) => m.porcentajeGrasa },
    { titulo: "Grasa visceral", valor: (m) => m.nivelGrasaVisceral },
  ];

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="p-2 font-semibold">Fecha</th>
            {columnas.map((c) => (
              <th key={c.titulo} className="p-2 text-right font-semibold">
                {c.titulo}
              </th>
            ))}
            <th className="p-2 font-semibold">Observaciones</th>
            <th className="w-20 p-2" aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {[...mediciones].reverse().map((medicion) => (
            <tr key={medicion.id} className="border-b last:border-0">
              <td className="whitespace-nowrap p-2 font-medium">
                {formatearFecha(medicion.fecha)}
              </td>
              {columnas.map((c) => (
                <td key={c.titulo} className="p-2 text-right tabular-nums">
                  {formatearMedida(c.valor(medicion))}
                </td>
              ))}
              <td className="max-w-xs truncate p-2 text-muted-foreground">
                {medicion.observaciones ?? ""}
              </td>
              <td className="p-2">
                <div className="flex justify-end gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditar(medicion)}
                    aria-label="Editar medición"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEliminar(medicion)}
                    aria-label="Eliminar medición"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
