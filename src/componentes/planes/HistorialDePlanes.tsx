"use client";

import Link from "next/link";
import { History, ExternalLink } from "lucide-react";
import { usePlanes } from "@/lib/hooks/usePlanes";
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
 * Todos los planes que siguió el paciente, del más reciente al más viejo.
 *
 * Incluye el vigente: es una línea de tiempo, y cortarle el tramo de hoy la
 * dejaría empezando en el pasado sin decir dónde termina.
 *
 * Las entradas cuyo plan se borró siguen acá, con el nombre que tenían al
 * asignarse. Eso es lo que lo hace un historial: qué siguió el paciente y entre
 * qué fechas es información suya y no se va con el plan.
 */
export function HistorialDePlanes({ pacienteId }: { pacienteId: string }) {
  const { historialDelPaciente } = usePlanes();
  const consulta = historialDelPaciente({ pacienteId });
  const historial = consulta.data ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-muted-foreground" />
          Historial de planes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {consulta.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : historial.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no se le asignó ningún plan.
          </p>
        ) : (
          <ul className="divide-y">
            {historial.map((asignacion) => (
              <li key={asignacion.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  {asignacion.planId ? (
                    <Link
                      href={`/dashboard/planes/${asignacion.planId}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium hover:text-primary"
                    >
                      {asignacion.nombrePlan}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </Link>
                  ) : (
                    // El plan ya no existe: queda el nombre que tenía. Se dice
                    // en pantalla para que no parezca un enlace roto.
                    <span className="text-sm font-medium">
                      {asignacion.nombrePlan}
                    </span>
                  )}
                  {asignacion.activa && (
                    <Badge variant="secondary">Vigente</Badge>
                  )}
                  {!asignacion.planId && (
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
