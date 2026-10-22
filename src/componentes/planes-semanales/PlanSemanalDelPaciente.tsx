"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Repeat,
  CircleOff,
  UserPlus,
  ExternalLink,
} from "lucide-react";
import { usePlanesSemanales } from "@/lib/hooks/usePlanesSemanales";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { VistaPlanSemanal } from "./VistaPlanSemanal";
import { FormularioAsignacionPlanSemanal } from "./FormularioAsignacionPlanSemanal";
import { HistorialDePlanesSemanales } from "./HistorialDePlanesSemanales";
import { rutaPlanSemanal } from "./rutas";

/**
 * El plan semanal del paciente: la sección «Plan semanal» de su pestaña de
 * Planes (ver `SeccionPlanesDelPaciente`).
 *
 * Vive al lado del plan nutricional y no adentro: son dos cosas que el
 * paciente puede tener a la vez. El semáforo de la última fila de la grilla
 * compara cada día contra las metas DEL PLAN SEMANAL (migración 91), no las
 * de sus planes nutricionales: con varios asignados no habría cuál elegir.
 */
export function PlanSemanalDelPaciente({
  pacienteId,
  nombrePaciente,
}: {
  pacienteId: string;
  nombrePaciente: string;
}) {
  const { delPaciente, desasignar } = usePlanesSemanales();
  const consulta = delPaciente({ pacienteId });
  const [asignarAbierto, setAsignarAbierto] = useState(false);
  const [confirmarFinalizar, setConfirmarFinalizar] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-medium">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10">
            <CalendarDays className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </span>
          Menú de la semana
        </h3>
        <div className="flex flex-wrap gap-2">
          {consulta.data ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAsignarAbierto(true)}
              >
                <Repeat className="h-4 w-4" />
                Cambiar plan semanal
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmarFinalizar(true)}
              >
                <CircleOff className="h-4 w-4" />
                Finalizar
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => setAsignarAbierto(true)}>
                <UserPlus className="h-4 w-4" />
                Asignar plan semanal
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/planes">Ver planes semanales</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {consulta.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : consulta.data ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{consulta.data.plan.nombre}</p>
            {/* Las metas y el menú se editan en la página del plan: es uno
                solo para todos los pacientes que lo tienen. */}
            <Button asChild variant="ghost" size="sm">
              <Link href={rutaPlanSemanal(consulta.data.plan.id)}>
                <ExternalLink className="h-4 w-4" />
                Abrir plan semanal
              </Link>
            </Button>
          </div>
          <VistaPlanSemanal plan={consulta.data.plan} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          El paciente no tiene un plan semanal asignado.
        </p>
      )}

      <HistorialDePlanesSemanales pacienteId={pacienteId} />

      <Dialog open={asignarAbierto} onOpenChange={setAsignarAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar plan semanal a {nombrePaciente}</DialogTitle>
          </DialogHeader>
          <FormularioAsignacionPlanSemanal
            pacienteIdFijo={pacienteId}
            onTerminado={() => setAsignarAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={confirmarFinalizar}
        titulo="Finalizar plan semanal"
        descripcion={`¿Finalizar el plan semanal de ${nombrePaciente}? Queda en el historial y el paciente pasa a no tener menú vigente.`}
        cargando={desasignar.isPending}
        onCancelar={() => setConfirmarFinalizar(false)}
        onConfirmar={() =>
          desasignar.mutate(
            { pacienteId },
            { onSuccess: () => setConfirmarFinalizar(false) },
          )
        }
      />
    </div>
  );
}
