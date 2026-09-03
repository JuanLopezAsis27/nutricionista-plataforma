"use client";

import { History } from "lucide-react";
import { usePlanesSemanales } from "@/lib/hooks/usePlanesSemanales";
import { formatearFecha } from "@/lib/formato";
import { Badge } from "@/componentes/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";

/**
 * Todos los planes semanales que siguió el paciente, del más reciente al más
 * viejo, incluido el vigente.
 *
 * Es un historial APARTE del de planes: el menú de la semana se cambia por su
 * cuenta —cada dos semanas, por ejemplo— sin que cambie la pauta de macros, y
 * mezclarlos haría ilegibles los dos.
 */
export function HistorialDePlanesSemanales({
  pacienteId,
}: {
  pacienteId: string;
}) {
  const { historialDelPaciente } = usePlanesSemanales();
  const consulta = historialDelPaciente({ pacienteId });
  const historial = consulta.data ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-muted-foreground" />
          Historial de planes semanales
        </CardTitle>
      </CardHeader>
      <CardContent>
        {consulta.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : historial.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no se le asignó ningún plan semanal.
          </p>
        ) : (
          <ul className="divide-y">
            {historial.map((asignacion) => (
              <li key={asignacion.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {asignacion.nombrePlan}
                  </span>
                  {asignacion.activa && (
                    <Badge variant="secondary">Vigente</Badge>
                  )}
                  {/* El plan ya no existe: queda el nombre que tenía. */}
                  {!asignacion.planSemanalId && (
                    <Badge variant="outline">Plan eliminado</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatearFecha(asignacion.fechaInicio)} →{" "}
                  {asignacion.activa
                    ? "hoy"
                    : asignacion.finalizadaEn
                      ? formatearFecha(asignacion.finalizadaEn)
                      : "fecha no registrada"}
                  {asignacion.activa &&
                    asignacion.fechaFin &&
                    ` · previsto hasta ${formatearFecha(asignacion.fechaFin)}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
