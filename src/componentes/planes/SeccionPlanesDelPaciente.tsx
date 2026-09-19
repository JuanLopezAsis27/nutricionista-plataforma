"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileDown,
  UserPlus,
  CircleOff,
  ClipboardList,
  CalendarRange,
  Plus,
  FileUp,
} from "lucide-react";
import type { ModalidadPlan } from "@/dominio/entidades/PlanNutricional";
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
import { TarjetaPlanAsignado } from "@/componentes/planes/TarjetaPlanAsignado";
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
 * ## Los planes son una lista de tarjetas, no todos abiertos
 *
 * El paciente puede tener VARIOS planes a la vez (migración 69), y dibujarlos
 * todos enteros uno abajo del otro hacía que el tercero quedara a cuatro
 * pantallas de scroll —peor con planes en PDF, que traen un visor cada uno—.
 * Así que la sección es maestro/detalle: las tarjetas resumen y el plan elegido
 * se abre completo en su lugar, con «Volver» arriba.
 *
 * **No se abre en un diálogo ni se va a `/dashboard/planes/[id]`**, a propósito.
 * Un visor de PDF adentro de un modal es un recuadro con scroll propio arriba
 * del scroll del diálogo —la misma razón por la que la receta tiene su propia
 * página—, y mandar a la ficha del plan saca al profesional de la ficha del
 * paciente para volver a entrar: ahí el plan se ve junto a sus OTROS pacientes,
 * que es la pregunta contraria a la que se está haciendo acá.
 *
 * Se guarda el **id** del plan abierto y el plan se lee de la query, no del
 * estado: si se edita, la vista tiene que mostrar lo nuevo. Un `useState` con
 * el objeto adentro queda congelado aunque se invalide la caché.
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
  const [planAbiertoId, setPlanAbiertoId] = useState<string | null>(null);
  const [confirmarDesasignar, setConfirmarDesasignar] = useState(false);
  const [crearModalidad, setCrearModalidad] = useState<ModalidadPlan | null>(
    null,
  );

  // El plan abierto sale de la LISTA por id. Si se lo desasignaron —o el id
  // quedó viejo— no hay nada que abrir y se vuelve solo a las tarjetas.
  const planAbierto = planes.find((plan) => plan.id === planAbiertoId) ?? null;

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
          {planAbierto ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setPlanAbiertoId(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver a los planes
                </Button>
                <div className="flex flex-wrap gap-2">
                  {/* El PDF generado arma el plan CARGADO con el membrete. Un
                      plan que YA es un PDF no tiene nada que generar: el suyo
                      se abre desde el visor. */}
                  {planAbierto.modalidad === "APP" && (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={`/api/planes/${planAbierto.id}/pdf?paciente=${pacienteId}`}
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
                    onClick={() => setConfirmarDesasignar(true)}
                  >
                    <CircleOff className="h-4 w-4" />
                    Desasignar
                  </Button>
                </div>
              </div>
              {/* Igual que en la ficha del plan: la receta que acompaña al
                  plan lleva a la receta, no es un nombre suelto. */}
              <VistaPlan
                plan={planAbierto}
                onVerReceta={(recetaId) =>
                  router.push(`/dashboard/recetas/${recetaId}`)
                }
              />
            </>
          ) : (
            <>
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
                <Skeleton className="h-24 w-full" />
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
                <div className="grid gap-3 sm:grid-cols-2">
                  {planes.map((plan) => (
                    <TarjetaPlanAsignado
                      key={plan.id}
                      plan={plan}
                      onAbrir={() => setPlanAbiertoId(plan.id)}
                    />
                  ))}
                </div>
              )}
            </>
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
        abierto={confirmarDesasignar}
        titulo="Desasignar plan"
        descripcion={`¿Sacarle «${planAbierto?.nombre ?? ""}» a ${nombre}? El plan sigue en el consultorio y los otros que tenga asignados no se tocan.`}
        // Sin esto el botón dice "Eliminar", que es justo lo que NO pasa: el
        // plan queda en el consultorio y solo se corta el vínculo.
        textoConfirmar="Desasignar"
        cargando={desasignar.isPending}
        onCancelar={() => setConfirmarDesasignar(false)}
        onConfirmar={() => {
          if (planAbierto) {
            desasignar.mutate(
              { planId: planAbierto.id, pacienteId },
              {
                onSuccess: () => {
                  setConfirmarDesasignar(false);
                  // Ya no lo tiene: la vista abierta dejó de existir.
                  setPlanAbiertoId(null);
                },
              },
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
