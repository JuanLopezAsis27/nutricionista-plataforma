"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, UtensilsCrossed } from "lucide-react";
import { useRecetas } from "@/lib/hooks/useRecetas";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import { VistaReceta } from "@/componentes/recetas/VistaReceta";

/**
 * Una receta del paciente, en su propia pantalla.
 *
 * Sale de `misRecetas` —la lista de las que le compartieron— y no de una
 * consulta por id: esa lista YA es la autorización (el paciente ve lo que le
 * asignaron y nada más), y pedir la receta suelta obligaría a un procedimiento
 * nuevo que repitiera la misma regla. React Query la tiene en caché desde el
 * listado, así que entrar y volver no vuelve a pegarle al servidor.
 *
 * Es una página y no un diálogo por lo mismo que en el recetario: si la receta
 * trae un documento, ese documento se muestra entero, y un visor de PDF adentro
 * de un modal es un recuadro con scroll propio arriba de otro.
 */
export default function PaginaMiReceta() {
  const params = useParams<{ id: string }>();
  const { misRecetas } = useRecetas();
  const consulta = misRecetas();

  const receta = consulta.data?.find((r) => r.id === params.id);

  const volver = (
    <Button asChild variant="outline" size="sm">
      <Link href="/mis-recetas">
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>
    </Button>
  );

  if (consulta.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!receta) {
    return (
      <div className="space-y-5">
        <EncabezadoPortal
          icono={UtensilsCrossed}
          titulo="Receta"
          descripcion="Esta receta no está entre las que te compartieron."
          acciones={volver}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <EncabezadoPortal
        icono={UtensilsCrossed}
        titulo={receta.nombre}
        descripcion="Una receta que te compartió tu nutricionista."
        acciones={volver}
      />
      <VistaReceta receta={receta} />
    </div>
  );
}
