"use client";

import Link from "next/link";
import { Medal, Trophy, ChevronRight, CalendarDays } from "lucide-react";
import { ETIQUETA_MODALIDAD_CARRERA } from "@/dominio/entidades/PlanificacionDeportiva";
import { usePlanificacionDeportiva } from "@/lib/hooks/usePlanificacionDeportiva";
import { useDeportivo } from "@/lib/hooks/useDeportivo";
import { esFechaPasada, formatearFecha } from "@/lib/formato";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Card, CardContent } from "@/componentes/ui/card";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import {
  numero,
  textoDuracion,
} from "@/componentes/planificacion-deportiva/presentacion";

/**
 * Portal del paciente: sus competencias y lo que tiene que comer en cada una
 * (migración 94).
 *
 * Es una pantalla aparte de «Mi plan» a propósito: el plan es lo de todos los
 * días; esto es la estrategia de UNA carrera —qué tomar y a qué minuto—, y
 * mezclarlos haría que el día a día se leyera entre geles y bebidas
 * isotónicas. Cada planificación aparece con la competencia para la que es;
 * las próximas competencias que todavía no tienen una, también, para que el
 * calendario se vea completo.
 */
export default function PaginaMisCompetencias() {
  const { mias } = usePlanificacionDeportiva();
  const { misCompetencias } = useDeportivo();
  const planificaciones = mias();
  const competencias = misCompetencias();

  // Las de competencias que vienen primero; las ya corridas, al final.
  const lista = [...(planificaciones.data ?? [])].sort(
    (a, b) =>
      Number(a.competencia != null && esFechaPasada(a.competencia.fecha)) -
      Number(b.competencia != null && esFechaPasada(b.competencia.fecha)),
  );
  const planificadas = new Set(
    lista.flatMap((p) => (p.competencia ? [p.competencia.id] : [])),
  );
  const sinPlanificar = (competencias.data ?? []).filter(
    (c) => !esFechaPasada(c.fecha) && !planificadas.has(c.id),
  );

  return (
    <div className="space-y-5">
      <EncabezadoPortal
        icono={Medal}
        titulo="Mis competencias"
        descripcion="Qué tomar y cuándo en cada carrera, según lo que planificó tu nutricionista."
      />

      {planificaciones.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : lista.length === 0 && sinPlanificar.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Todavía no tenés planificaciones de competencia.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lista.map(({ planificacion: p, competencia }) => {
            const pasada =
              competencia != null && esFechaPasada(competencia.fecha);
            return (
              <Link
                key={p.id}
                href={`/mis-competencias/${p.id}`}
                className="block"
              >
                <Card className="transition-colors hover:border-primary">
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Trophy className="h-5 w-5 text-primary" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="font-semibold">
                        {competencia?.nombre ?? p.nombre}
                      </p>
                      {competencia && (
                        <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatearFecha(competencia.fecha)}
                          {competencia.lugar && ` · ${competencia.lugar}`}
                          {pasada && (
                            <Badge variant="outline">Finalizada</Badge>
                          )}
                        </p>
                      )}
                      {p.carrera && (
                        <p className="text-sm text-muted-foreground">
                          {ETIQUETA_MODALIDAD_CARRERA[p.carrera.modalidad]} ·{" "}
                          {numero(p.carrera.distanciaKm, " km")} ·{" "}
                          {textoDuracion(p.carrera.duracionEstimadaMin)} ·{" "}
                          {p.ingestas.length}{" "}
                          {p.ingestas.length === 1 ? "ingesta" : "ingestas"}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          {sinPlanificar.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium text-muted-foreground">
                Próximas competencias sin planificación
              </p>
              <ul className="divide-y rounded-md border text-sm">
                {sinPlanificar.map((c) => (
                  <li key={c.id} className="flex flex-wrap gap-2 p-3">
                    <span className="font-medium">{c.nombre}</span>
                    <span className="text-muted-foreground">
                      {formatearFecha(c.fecha)}
                      {c.lugar && ` · ${c.lugar}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
