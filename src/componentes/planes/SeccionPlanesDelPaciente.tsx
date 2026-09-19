"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileDown,
  UserPlus,
  CircleOff,
  ClipboardList,
  CalendarRange,
  Plus,
  FileUp,
} from "lucide-react";
import type { ModalidadPlan } from "@/dominio/entidades/PlanNutricional";
import type { PlanSalidaDto } from "@/aplicacion/dtos/plan.dto";
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
import { FormularioPlan } from "@/componentes/planes/FormularioPlan";
import { FormularioAsignacionPlan } from "@/componentes/planes/FormularioAsignacionPlan";
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
 *
 * El paciente puede tener VARIOS planes nutricionales a la vez (migración 69),
 * así que la sección es una lista y cada plan trae sus propias acciones. Las de
 * arriba —crear, subir, asignar— son del paciente y suman uno más; las de cada
 * tarjeta actúan sobre ESE plan y no sobre los otros.
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
  const router = useRouter();
  const consulta = delPaciente({ pacienteId });
  const planes = consulta.data ?? [];
  const [asignarAbierto, setAsignarAbierto] = useState(false);
  const [desasignarPlan, setDesasignarPlan] = useState<PlanSalidaDto | null>(
    null,
  );
  const [crearModalidad, setCrearModalidad] = useState<ModalidadPlan | null>(
    null,
  );

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
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCrearModalidad("APP")}
            >
              <Plus className="h-4 w-4" />
              Crear plan nuevo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCrearModalidad("PDF")}
            >
              <FileUp className="h-4 w-4" />
              Subir plan (PDF o Word)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAsignarAbierto(true)}
            >
              <UserPlus className="h-4 w-4" />
              Asignar plan existente
            </Button>
          </div>

          {consulta.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : planes.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                El paciente no tiene ningún plan asignado.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/planes">Ver planes</Link>
              </Button>
            </div>
          ) : (
            planes.map((plan) => (
              <div key={plan.id} className="space-y-2">
                <div className="flex flex-wrap justify-end gap-2">
                  {/* El PDF generado arma el plan CARGADO con el membrete. Un
                      plan que YA es un PDF no tiene nada que generar: el suyo
                      se abre desde el visor. */}
                  {plan.modalidad === "APP" && (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={`/api/planes/${plan.id}/pdf?paciente=${pacienteId}`}
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
                    onClick={() => setDesasignarPlan(plan)}
                  >
                    <CircleOff className="h-4 w-4" />
                    Desasignar
                  </Button>
                </div>
                {/* Igual que en la ficha del plan: la receta que acompaña al
                    plan lleva a la receta, no es un nombre suelto. */}
                <VistaPlan
                  plan={plan}
                  onVerReceta={(recetaId) =>
                    router.push(`/dashboard/recetas/${recetaId}`)
                  }
                />
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="semanal" className="mt-4">
          <PlanSemanalDelPaciente
            pacienteId={pacienteId}
            nombrePaciente={nombre}
          />
        </TabsContent>
      </Tabs>

      <ModalConfirmacion
        abierto={desasignarPlan !== null}
        titulo="Desasignar plan"
        descripcion={`¿Sacarle «${desasignarPlan?.nombre ?? ""}» a ${nombre}? El plan sigue en el consultorio y los otros que tenga asignados no se tocan.`}
        cargando={desasignar.isPending}
        onCancelar={() => setDesasignarPlan(null)}
        onConfirmar={() => {
          if (desasignarPlan) {
            desasignar.mutate(
              { planId: desasignarPlan.id, pacienteId },
              { onSuccess: () => setDesasignarPlan(null) },
            );
          }
        }}
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

      <Dialog
        open={crearModalidad !== null}
        onOpenChange={(abierto) => !abierto && setCrearModalidad(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {crearModalidad === "PDF"
                ? `Subir plan para ${nombre} ${apellido}`
                : `Nuevo plan para ${nombre} ${apellido}`}
            </DialogTitle>
          </DialogHeader>
          {crearModalidad && (
            <FormularioPlan
              modalidad={crearModalidad}
              paraPaciente={{ pacienteId, nombre, apellido }}
              onTerminado={() => setCrearModalidad(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
