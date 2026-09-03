"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarRange, CalendarDays, LayoutGrid, Rows3 } from "lucide-react";
import { usePlanesSemanales } from "@/lib/hooks/usePlanesSemanales";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Card, CardContent } from "@/componentes/ui/card";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import { VistaSemanaPaciente } from "@/componentes/planes-semanales/VistaSemanaPaciente";
import { VistaPlanSemanal } from "@/componentes/planes-semanales/VistaPlanSemanal";

/**
 * Portal del paciente: el menú de la semana que le asignó su nutricionista.
 *
 * Es una pantalla aparte de «Mi plan» y no una pestaña suya porque son dos
 * cosas distintas: el plan nutricional es el DÍA TIPO —las franjas y sus
 * opciones, válidas para cualquier día— y el plan semanal dice qué se come el
 * lunes al mediodía, que no es lo del martes (ver `docs/PLANES-SEMANALES.md`).
 * Un paciente puede tener los dos a la vez, y esconder el menú adentro del
 * plan haría que la pantalla que se mira todos los días quedara a dos toques.
 */
export default function PaginaMiSemana() {
  const { miPlanSemanal } = usePlanesSemanales();
  const consulta = miPlanSemanal();
  const [vista, setVista] = useState<"dia" | "semana">("dia");

  return (
    <div className="space-y-5">
      <EncabezadoPortal
        icono={CalendarRange}
        titulo="Mi semana"
        descripcion="El menú que armó tu nutricionista, día por día."
        acciones={
          /* El cambio a la semana completa solo se ofrece donde entra: en un
             teléfono la grilla de siete columnas se barre de costado y es justo
             lo que esta pantalla vino a evitar. */
          consulta.data && (
            <div className="hidden rounded-xl border bg-card p-1 lg:flex">
              <BotonVista
                activo={vista === "dia"}
                onClick={() => setVista("dia")}
                icono={Rows3}
                etiqueta="Por día"
              />
              <BotonVista
                activo={vista === "semana"}
                onClick={() => setVista("semana")}
                icono={LayoutGrid}
                etiqueta="Semana completa"
              />
            </div>
          )
        }
      />

      {consulta.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : consulta.data ? (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-baseline gap-x-2 border-b bg-violet-500/5 px-4 py-3">
            <p className="text-base font-semibold">
              {consulta.data.plan.nombre}
            </p>
            {consulta.data.plan.descripcion && (
              <p className="text-sm text-muted-foreground">
                {consulta.data.plan.descripcion}
              </p>
            )}
          </div>
          <CardContent className="p-4 sm:p-5">
            {/* Abajo de lg siempre manda la vista por día: la grilla completa
                no entra, así que el selector de arriba solo existe en lg. */}
            <div className={cn(vista === "semana" && "lg:hidden")}>
              <VistaSemanaPaciente
                plan={consulta.data.plan}
                dias={consulta.data.dias}
                metas={consulta.data.metas}
              />
            </div>
            {vista === "semana" && (
              <div className="hidden lg:block">
                <VistaPlanSemanal
                  plan={consulta.data.plan}
                  dias={consulta.data.dias}
                  metas={consulta.data.metas}
                  nombrePlanDeLasMetas={consulta.data.nombrePlanDeLasMetas}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CalendarDays className="h-6 w-6 text-primary" />
            </span>
            <div>
              <p className="font-medium">Todavía no tenés un menú semanal</p>
              <p className="pt-1 text-sm text-muted-foreground">
                Tu nutricionista puede asignarte uno. Mientras tanto, tu plan
                con las comidas del día está en «Mi plan».
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/mi-plan">Ver mi plan</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BotonVista({
  activo,
  onClick,
  icono: Icono,
  etiqueta,
}: {
  activo: boolean;
  onClick: () => void;
  icono: typeof Rows3;
  etiqueta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        activo
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icono className="h-4 w-4" />
      {etiqueta}
    </button>
  );
}
