"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, CircleOff, ExternalLink } from "lucide-react";
import type { AsignacionConPacienteDto } from "@/aplicacion/dtos/plan.dto";
import { usePlanes } from "@/lib/hooks/usePlanes";
import { formatearFecha } from "@/lib/formato";
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
 * Quiénes tienen —o tuvieron— este plan.
 *
 * Muestra las asignaciones históricas y no solo las vigentes: un plan que se
 * usó y se dejó de usar sigue siendo un plan usado, y esconderlo haría pensar
 * que nunca se asignó (por ejemplo al ir a borrarlo).
 *
 * Finalizar desde acá es la contracara de asignar desde la ficha del plan: se
 * decide sobre el plan, y obligar a entrar a cada paciente para soltarlo era
 * el mismo viaje de ida y vuelta que ya se sacó en la asignación.
 */
export function PacientesDelPlan({ planId }: { planId: string }) {
  const { pacientesDelPlan, desasignar } = usePlanes();
  const consulta = pacientesDelPlan({ id: planId });
  const [finalizar, setFinalizar] = useState<AsignacionConPacienteDto | null>(
    null,
  );

  const asignaciones = consulta.data ?? [];
  const activas = asignaciones.filter((a) => a.activa);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-muted-foreground" />
          Pacientes con este plan
          {activas.length > 0 && (
            <Badge variant="secondary">
              {activas.length} vigente{activas.length > 1 ? "s" : ""}
            </Badge>
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
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/pacientes/${asignacion.pacienteId}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium hover:text-primary"
                  >
                    {asignacion.pacienteNombre} {asignacion.pacienteApellido}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Desde {formatearFecha(asignacion.fechaInicio)}
                    {!asignacion.activa &&
                      ` · hasta ${
                        asignacion.finalizadaEn
                          ? formatearFecha(asignacion.finalizadaEn)
                          : "fecha no registrada"
                      }`}
                  </p>
                </div>
                {asignacion.activa ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFinalizar(asignacion)}
                  >
                    <CircleOff className="h-4 w-4" />
                    Finalizar
                  </Button>
                ) : (
                  <Badge variant="outline">Finalizado</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ModalConfirmacion
        abierto={finalizar !== null}
        titulo="Finalizar plan"
        descripcion={`¿Finalizar este plan para ${finalizar?.pacienteNombre ?? ""} ${
          finalizar?.pacienteApellido ?? ""
        }? Queda en su historial, pero deja de ser su plan vigente.`}
        cargando={desasignar.isPending}
        onCancelar={() => setFinalizar(null)}
        onConfirmar={() => {
          if (finalizar) {
            desasignar.mutate(
              { pacienteId: finalizar.pacienteId },
              { onSuccess: () => setFinalizar(null) },
            );
          }
        }}
      />
    </Card>
  );
}
