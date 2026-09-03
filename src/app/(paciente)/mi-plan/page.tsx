"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  ClipboardList,
  FileDown,
  Pill,
} from "lucide-react";
import { usePlanes } from "@/lib/hooks/usePlanes";
import { usePlanesSemanales } from "@/lib/hooks/usePlanesSemanales";
import { useSeguimiento } from "@/lib/hooks/useSeguimiento";
import { formatearFecha } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import { VistaPlan } from "@/componentes/planes/VistaPlan";

/** Mi plan: plan nutricional activo + suplementación vigente, con PDF. */
export default function PaginaMiPlan() {
  const { miPlan } = usePlanes();
  const { miPlanSemanal } = usePlanesSemanales();
  const { misSuplementos } = useSeguimiento();
  const consulta = miPlan();
  const semanal = miPlanSemanal();
  const suplementos = misSuplementos();

  return (
    <div className="space-y-5">
      <EncabezadoPortal
        icono={ClipboardList}
        titulo="Mi plan"
        descripcion="Tu plan nutricional vigente: las comidas de un día y las opciones de cada franja."
        acciones={
          /* Solo para el plan cargado en la app: el plan que subió el
             profesional se ve —y se abre— desde el visor de VistaPlan. */
          consulta.data?.modalidad === "APP" && (
            <Button asChild variant="outline" size="sm">
              <a
                href={`/api/planes/${consulta.data.id}/pdf`}
                target="_blank"
                rel="noreferrer"
              >
                <FileDown className="h-4 w-4" />
                Descargar PDF
              </a>
            </Button>
          )
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
      ) : consulta.data ? (
        <VistaPlan plan={consulta.data} />
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
