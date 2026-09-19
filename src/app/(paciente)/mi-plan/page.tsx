"use client";

import Link from "next/link";
import { ArrowRight, CalendarRange, ClipboardList, Pill } from "lucide-react";
import { usePlanes } from "@/lib/hooks/usePlanes";
import { usePlanesSemanales } from "@/lib/hooks/usePlanesSemanales";
import { useSeguimiento } from "@/lib/hooks/useSeguimiento";
import { formatearFecha } from "@/lib/formato";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import { MiPlanCompleto } from "@/componentes/planes/MiPlanCompleto";
import { TarjetaPlanAsignado } from "@/componentes/planes/TarjetaPlanAsignado";

/**
 * Mi plan: los planes nutricionales asignados + suplementación vigente.
 *
 * Pueden ser VARIOS (migración 69): el profesional le puede dejar la pauta
 * general y, aparte, el plan de la semana de competencia. Ninguno reemplaza al
 * otro. Cómo se muestran depende de cuántos son:
 *
 * - **uno**: el plan entero, directo. Es el caso común, y una tarjeta que hay
 *   que tocar para ver lo único que hay sería un paso de más.
 * - **varios**: una tarjeta por plan, y cada una lleva a `/mi-plan/[id]`.
 *   Dibujarlos todos enteros dejaba el segundo a varias pantallas de scroll en
 *   el teléfono, y con planes en PDF, un visor abajo del otro.
 *
 * Son páginas y no un "abrir en el lugar" como en la ficha del profesional: el
 * portal se usa desde el teléfono y la app de Android, y ahí el botón "atrás"
 * del sistema tiene que volver a la lista. Con el plan abierto en un estado de
 * la pantalla, "atrás" sacaría al paciente de «Mi plan». Es el mismo criterio
 * que la receta, que tiene `/mis-recetas/[id]`.
 */
export default function PaginaMiPlan() {
  const { misPlanes } = usePlanes();
  const { miPlanSemanal } = usePlanesSemanales();
  const { misSuplementos } = useSeguimiento();
  const consulta = misPlanes();
  const planes = consulta.data ?? [];
  const semanal = miPlanSemanal();
  const suplementos = misSuplementos();

  return (
    <div className="space-y-5">
      <EncabezadoPortal
        icono={ClipboardList}
        titulo="Mi plan"
        descripcion={
          planes.length > 1
            ? "Tenés varios planes: elegí cuál querés ver."
            : "Tu plan nutricional: las comidas de un día y las opciones de cada franja."
        }
      />

      {/* El plan es el DÍA TIPO; el menú de la semana es otra pantalla y se
          anuncia acá porque el paciente que busca «qué como» entra por esta.
          Solo aparece si tiene uno: ofrecer lo que no le asignaron es ruido. */}
      {semanal.data && (
        <Link
          href="/mi-semana"
          className="group flex items-center gap-3 rounded-xl border bg-violet-500/5 p-3 transition-colors hover:border-violet-500/40"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
            <CalendarRange className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">
              También tenés un menú semanal
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {semanal.data.plan.nombre} · qué comer cada día de la semana
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      {consulta.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : planes.length > 1 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {planes.map((plan) => (
            <TarjetaPlanAsignado
              key={plan.id}
              plan={plan}
              href={`/mi-plan/${plan.id}`}
            />
          ))}
        </div>
      ) : planes.length === 1 ? (
        <MiPlanCompleto plan={planes[0]!} />
      ) : (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ClipboardList className="h-6 w-6 text-primary" />
          </span>
          <p className="pt-3 text-sm text-muted-foreground">
            Todavía no tenés un plan asignado. Tu nutricionista lo va a cargar
            en tu próxima consulta.
          </p>
        </div>
      )}

      {(suplementos.data ?? []).length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-amber-500/5 p-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                <Pill className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </span>
              Mi suplementación
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ul className="divide-y">
              {suplementos.data!.map((suplemento) => (
                <li key={suplemento.id} className="py-2.5 text-sm first:pt-0">
                  <p className="font-medium">{suplemento.nombre}</p>
                  <p className="text-muted-foreground">
                    {[suplemento.dosis, suplemento.frecuencia]
                      .filter(Boolean)
                      .join(" · ") || "Según indicación"}
                    {suplemento.hasta &&
                      ` · hasta ${formatearFecha(suplemento.hasta)}`}
                  </p>
                  {suplemento.notas && (
                    <p className="text-xs text-muted-foreground">
                      {suplemento.notas}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
