"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { usePlanes } from "@/lib/hooks/usePlanes";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import { MiPlanCompleto } from "@/componentes/planes/MiPlanCompleto";

/**
 * Uno de los planes del paciente, en su propia pantalla. Se llega desde las
 * tarjetas de «Mi plan» cuando tiene más de uno.
 *
 * Sale de `misPlanes` —los que tiene asignados— y no de una consulta por id:
 * esa lista YA es la autorización (el paciente ve lo que le asignaron y nada
 * más), y pedir el plan suelto obligaría a un procedimiento nuevo que repitiera
 * la misma regla. Es el mismo criterio que `/mis-recetas/[id]`. React Query lo
 * tiene en caché desde «Mi plan», así que entrar y volver no vuelve a pegarle
 * al servidor.
 *
 * Un id que no está en la lista —uno ajeno, o un plan que le desasignaron
 * mientras tenía la pantalla abierta— no muestra nada del plan: dice que no
 * está entre los suyos y ofrece volver.
 */
export default function PaginaUnPlan() {
  const params = useParams<{ id: string }>();
  const { misPlanes } = usePlanes();
  const consulta = misPlanes();

  const plan = consulta.data?.find((p) => p.id === params.id);

  const volver = (
    <Button asChild variant="outline" size="sm">
      <Link href="/mi-plan">
        <ArrowLeft className="h-4 w-4" />
        Mis planes
      </Link>
    </Button>
  );

  if (consulta.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!plan) {
    return (
      <div className="space-y-5">
        <EncabezadoPortal
          icono={ClipboardList}
          titulo="Plan"
          descripcion="Este plan no está entre los que tenés asignados."
          acciones={volver}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* "Mi plan" y no el nombre: `VistaPlan` ya lo pone de título justo
          abajo, y repetido se lee como dos planes. */}
      <EncabezadoPortal
        icono={ClipboardList}
        titulo="Mi plan"
        descripcion="Uno de tus planes nutricionales."
        acciones={volver}
      />
      <MiPlanCompleto plan={plan} />
    </div>
  );
}
