"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, CircleOff, ExternalLink } from "lucide-react";
import type { AsignacionConPacienteDto } from "@/aplicacion/dtos/plan.dto";
import { usePlanes } from "@/lib/hooks/usePlanes";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";

/**
 * Quiénes tienen este plan asignado.
 *
 * Es lo primero que se quiere saber antes de sumar más pacientes —y antes de
 * borrar el plan—, así que la lista va tanto en la ficha del plan como debajo
 * del diálogo de "Asignar a paciente".
 *
 * Desasignar desde acá es la contracara de asignar desde la ficha del plan: se
 * decide sobre el plan, y obligar a entrar a cada paciente para soltarlo era
 * el mismo viaje de ida y vuelta que ya se sacó en la asignación. Al paciente
 * le saca SOLO este plan: los otros que tenga siguen asignados.
 */
export function PacientesDelPlan({ planId }: { planId: string }) {
  const { pacientesDelPlan, desasignar } = usePlanes();
  const consulta = pacientesDelPlan({ id: planId });
  const [desasignarA, setDesasignarA] =
    useState<AsignacionConPacienteDto | null>(null);

  const asignaciones = consulta.data ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-muted-foreground" />
          Pacientes con este plan
          {asignaciones.length > 0 && (
            <Badge variant="secondary">{asignaciones.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {consulta.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : asignaciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no se le asignó a nadie.
          </p>
        ) : (
          <ul className="divide-y">
            {asignaciones.map((asignacion) => (
              <li
                key={asignacion.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <Link
                  href={`/dashboard/pacientes/${asignacion.pacienteId}`}
                  className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium hover:text-primary"
                >
                  {asignacion.pacienteNombre} {asignacion.pacienteApellido}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDesasignarA(asignacion)}
                >
                  <CircleOff className="h-4 w-4" />
                  Desasignar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ModalConfirmacion
        abierto={desasignarA !== null}
        titulo="Desasignar plan"
        descripcion={`¿Sacarle este plan a ${desasignarA?.pacienteNombre ?? ""} ${
          desasignarA?.pacienteApellido ?? ""
        }? Los otros planes que tenga siguen asignados.`}
        cargando={desasignar.isPending}
        onCancelar={() => setDesasignarA(null)}
        onConfirmar={() => {
          if (desasignarA) {
            desasignar.mutate(
              { planId, pacienteId: desasignarA.pacienteId },
              { onSuccess: () => setDesasignarA(null) },
            );
          }
        }}
      />
    </Card>
  );
}
