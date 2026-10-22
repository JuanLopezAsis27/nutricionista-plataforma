"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, CircleOff, ExternalLink } from "lucide-react";
import type { AsignacionSemanalConPacienteDto } from "@/aplicacion/dtos/planSemanal.dto";
import { usePlanesSemanales } from "@/lib/hooks/usePlanesSemanales";
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
 * Quiénes siguen —o siguieron— este plan semanal. Es la contracara de
 * `PacientesDelPlan` en la página de un plan nutricional.
 *
 * A diferencia de aquel, acá hay historial: un paciente tiene UN plan semanal
 * vigente y los anteriores quedan finalizados (`AsignacionPlanSemanal`). Por
 * eso la lista muestra los dos estados, los vigentes primero, y «Finalizar»
 * es lo mismo que el botón de la ficha del paciente: cierra su menú vigente.
 */
export function PacientesDelPlanSemanal({
  planSemanalId,
}: {
  planSemanalId: string;
}) {
  const { pacientesDelPlan, desasignar } = usePlanesSemanales();
  const consulta = pacientesDelPlan({ id: planSemanalId });
  const [finalizarA, setFinalizarA] =
    useState<AsignacionSemanalConPacienteDto | null>(null);

  const asignaciones = consulta.data ?? [];
  const vigentes = asignaciones.filter((a) => a.activa).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-muted-foreground" />
          Pacientes con este plan semanal
          {vigentes > 0 && <Badge variant="secondary">{vigentes}</Badge>}
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
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/pacientes/${asignacion.pacienteId}`}
                    className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium hover:text-primary"
                  >
                    {asignacion.pacienteNombre} {asignacion.pacienteApellido}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    desde {formatearFecha(asignacion.fechaInicio)}
                    {asignacion.activa
                      ? asignacion.fechaFin
                        ? ` hasta ${formatearFecha(asignacion.fechaFin)}`
                        : ""
                      : ` · finalizado ${formatearFecha(asignacion.finalizadaEn ?? asignacion.fechaFin)}`}
                  </span>
                  {asignacion.activa && (
                    <Badge variant="outline">Vigente</Badge>
                  )}
                </span>
                {asignacion.activa && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFinalizarA(asignacion)}
                  >
                    <CircleOff className="h-4 w-4" />
                    Finalizar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ModalConfirmacion
        abierto={finalizarA !== null}
        titulo="Finalizar plan semanal"
        descripcion={`¿Finalizar el plan semanal de ${finalizarA?.pacienteNombre ?? ""} ${
          finalizarA?.pacienteApellido ?? ""
        }? Queda en su historial y pasa a no tener menú vigente.`}
        textoConfirmar="Finalizar"
        cargando={desasignar.isPending}
        onCancelar={() => setFinalizarA(null)}
        onConfirmar={() => {
          if (finalizarA) {
            desasignar.mutate(
              { pacienteId: finalizarA.pacienteId },
              { onSuccess: () => setFinalizarA(null) },
            );
          }
        }}
      />
    </Card>
  );
}
