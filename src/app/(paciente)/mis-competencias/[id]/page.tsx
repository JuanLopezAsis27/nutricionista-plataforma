"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Medal } from "lucide-react";
import { usePlanificacionDeportiva } from "@/lib/hooks/usePlanificacionDeportiva";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import { VistaPlanificacion } from "@/componentes/planificacion-deportiva/VistaPlanificacion";

/**
 * Una planificación de competencia del paciente, en su propia pantalla.
 *
 * Sale de `mias` —la lista de las que le asignaron— y no de una consulta por
 * id: esa lista YA es la autorización, como en «Mis recetas». React Query la
 * tiene en caché desde el listado.
 */
export default function PaginaMiCompetencia() {
  const { id } = useParams<{ id: string }>();
  const { mias } = usePlanificacionDeportiva();
  const consulta = mias();
  const asignacion = consulta.data?.find((a) => a.planificacion.id === id);

  const volver = (
    <Button asChild variant="outline" size="sm">
      <Link href="/mis-competencias">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
    </Button>
  );

  if (consulta.isLoading) return <Skeleton className="h-64 w-full" />;

  if (!asignacion) {
    return (
      <EncabezadoPortal
        icono={Medal}
        titulo="Planificación"
        descripcion="Esta planificación no está entre las que te asignaron."
        acciones={volver}
      />
    );
  }

  return (
    <div className="space-y-5">
      <EncabezadoPortal
        icono={Medal}
        titulo={asignacion.planificacion.nombre}
        descripcion="Lo que tenés que tomar antes y durante la carrera."
        acciones={volver}
      />
      <VistaPlanificacion
        planificacion={asignacion.planificacion}
        competencia={asignacion.competencia}
      />
    </div>
  );
}
