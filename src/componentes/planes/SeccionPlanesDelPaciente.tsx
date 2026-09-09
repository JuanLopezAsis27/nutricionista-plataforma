"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileDown,
  UserPlus,
  CircleOff,
  Repeat,
  ClipboardList,
  CalendarRange,
} from "lucide-react";
import { usePlanes } from "@/lib/hooks/usePlanes";
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
import { VistaPlan } from "@/componentes/planes/VistaPlan";
import { FormularioAsignacionPlan } from "@/componentes/planes/FormularioAsignacionPlan";
import { HistorialDePlanes } from "@/componentes/planes/HistorialDePlanes";
import { PlanSemanalDelPaciente } from "@/componentes/planes-semanales/PlanSemanalDelPaciente";

/**
 * Los planes del paciente, en dos secciones separadas.
 *
 * **Plan nutricional** es la pauta —franjas, opciones y metas de macros— y
 * **Plan semanal** es el menú concreto de la semana. Son dos cosas con su
 * propio ciclo de vida: se cambia el menú sin tocar la pauta, y al revés. Una
 * debajo de la otra en la misma pestaña las hacía competir por el scroll y
 * escondía la segunda, que es exactamente la que el paciente mira todos los
 * días.
 *
 * Se navegan como la pestaña de Antropometría (Dashboard / Mediciones /
 * Objetivos): una sola pestaña en la ficha y adentro sus secciones.
 */
export function SeccionPlanesDelPaciente({
  pacienteId,
  nombre,
  apellido,
}: {
  pacienteId: string;
  nombre: string;
  apellido: string;
}) {
  const { delPaciente, desasignar } = usePlanes();
  const plan = delPaciente({ pacienteId });
  const [asignarAbierto, setAsignarAbierto] = useState(false);
  const [confirmarDesasignar, setConfirmarDesasignar] = useState(false);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="nutricional">
        <TabsList>
          <TabsTrigger value="nutricional" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            Plan nutricional
          </TabsTrigger>
          <TabsTrigger value="semanal" className="gap-1.5">
            <CalendarRange className="h-4 w-4" />
            Plan semanal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nutricional" className="mt-4 space-y-4">
          {plan.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : plan.data ? (
            <>
              <div className="flex flex-wrap justify-end gap-2">
                {/* El PDF generado arma el plan CARGADO con el membrete. Un
                    plan que YA es un PDF no tiene nada que generar: el suyo se
                    abre desde el visor. */}
                {plan.data.modalidad === "APP" && (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={`/api/planes/${plan.data.id}/pdf?paciente=${pacienteId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FileDown className="h-4 w-4" />
                      PDF
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAsignarAbierto(true)}
                >
                  <Repeat className="h-4 w-4" />
                  Cambiar plan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmarDesasignar(true)}
                >
                  <CircleOff className="h-4 w-4" />
                  Finalizar plan
                </Button>
              </div>
              <VistaPlan plan={plan.data} />
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                El paciente no tiene un plan activo asignado.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setAsignarAbierto(true)}>
                  <UserPlus className="h-4 w-4" />
                  Asignar plan
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/planes">Ver planes</Link>
                </Button>
              </div>
            </div>
          )}

          <HistorialDePlanes pacienteId={pacienteId} />
        </TabsContent>

        <TabsContent value="semanal" className="mt-4">
          <PlanSemanalDelPaciente
            pacienteId={pacienteId}
            nombrePaciente={nombre}
          />
        </TabsContent>
      </Tabs>

      <ModalConfirmacion
        abierto={confirmarDesasignar}
        titulo="Finalizar plan"
        descripcion={`¿Finalizar el plan activo de ${nombre}? El paciente quedará sin plan asignado.`}
        cargando={desasignar.isPending}
        onCancelar={() => setConfirmarDesasignar(false)}
        onConfirmar={() =>
          desasignar.mutate(
            { pacienteId },
            { onSuccess: () => setConfirmarDesasignar(false) },
          )
        }
      />

      <Dialog open={asignarAbierto} onOpenChange={setAsignarAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Asignar plan a {nombre} {apellido}
            </DialogTitle>
          </DialogHeader>
          <FormularioAsignacionPlan
            pacienteIdFijo={pacienteId}
            onTerminado={() => setAsignarAbierto(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
