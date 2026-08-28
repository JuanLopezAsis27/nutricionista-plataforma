"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, UserCog } from "lucide-react";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { formatearFecha } from "@/lib/formato";
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
import { DashboardComposicion } from "./DashboardComposicion";
import { FormularioMedicion } from "./FormularioMedicion";
import { ObjetivosComposicion } from "./ObjetivosComposicion";
import { TablaMediciones } from "./TablaMediciones";

/**
 * Pestaña de Antropometría del paciente: la única sección donde se cargan y
 * se leen medidas corporales.
 *
 * Tres vistas del mismo dato: el dashboard (qué dicen las medidas), la
 * planilla (qué se midió) y los objetivos (a dónde va). La evolución del peso
 * en el diario del paciente vive en «Progreso», que es otra fuente: ahí es el
 * paciente el que se pesa en casa, acá es el profesional en consulta.
 */
export function SeccionComposicionCorporal({
  pacienteId,
}: {
  pacienteId: string;
}) {
  const { obtenerComposicion, eliminarAntropometria } = useEvaluacion();
  const composicion = obtenerComposicion({ pacienteId });

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<MedicionComposicionDto | null>(null);
  const [eliminando, setEliminando] = useState<MedicionComposicionDto | null>(
    null,
  );

  if (composicion.isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }
  if (composicion.isError || !composicion.data) {
    return (
      <p className="text-sm text-destructive">
        No se pudo cargar la composición corporal del paciente.
      </p>
    );
  }

  const { mediciones, objetivos, sexo } = composicion.data;

  const abrirNueva = () => {
    setEditando(null);
    setAbierto(true);
  };

  return (
    <div className="space-y-4">
      {sexo == null && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed p-3 text-sm">
          <p className="flex items-start gap-2">
            <UserCog className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              Falta el <span className="font-medium">sexo biológico</span> del
              paciente. Sin él no se pueden fraccionar las masas ni estimar el
              metabolismo: son constantes distintas por sexo.
            </span>
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/pacientes/${pacienteId}?editar=1`}>
              Completar ficha
            </Link>
          </Button>
        </div>
      )}

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
          <Button size="sm" onClick={abrirNueva}>
            <Plus className="h-4 w-4" />
            Nueva medición
          </Button>
        </div>

        <TabsContent value="dashboard" className="mt-4">
          <DashboardComposicion mediciones={mediciones} />
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
          <ObjetivosComposicion pacienteId={pacienteId} objetivos={objetivos} />
        </TabsContent>
      </Tabs>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando
                ? `Editar medición del ${formatearFecha(editando.fecha)}`
                : "Nueva medición antropométrica"}
            </DialogTitle>
          </DialogHeader>
          <FormularioMedicion
            pacienteId={pacienteId}
            medicionInicial={editando}
            onTerminado={() => setAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={eliminando !== null}
        titulo="Eliminar medición"
        descripcion={`¿Eliminar la medición del ${formatearFecha(eliminando?.fecha)}? Se pierden todas las medidas de esa consulta.`}
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
