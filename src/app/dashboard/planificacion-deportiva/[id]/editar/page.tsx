"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { usePlanificacionDeportiva } from "@/lib/hooks/usePlanificacionDeportiva";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { FormularioPlanificacion } from "@/componentes/planificacion-deportiva/FormularioPlanificacion";
import { formularioDesdeGuardado } from "@/componentes/planificacion-deportiva/formulario/esquema";
import {
  RUTA_PLANIFICACION,
  rutaPlanificacion,
  volverSeguro,
} from "@/componentes/planificacion-deportiva/rutas";

/**
 * Edición de una planificación. Si está asignada a varios pacientes, el
 * cambio lo ven todos: para adaptarla a uno solo se la duplica.
 *
 * El formulario arranca de la query por id y se monta UNA vez: un refresco de
 * fondo no pisa lo que se está escribiendo. La versión que se manda al
 * guardar es la que se abrió (`version`), no la última que trajo la query: si
 * otro la guardó mientras tanto, el servidor rechaza esta edición en vez de
 * pisar la suya (bloqueo optimista).
 */
export default function PaginaEditarPlanificacion() {
  const { id } = useParams<{ id: string }>();
  const buscar = useSearchParams();
  const router = useRouter();
  const { obtener, actualizar, pacientesDe } = usePlanificacionDeportiva();
  const consulta = obtener({ id });
  const pacientes = pacientesDe({ id });
  const volver = volverSeguro(buscar.get("volver")) ?? rutaPlanificacion(id);
  // Se fija al llegar los datos y no se vuelve a tocar (ajuste en el render,
  // no en un efecto: así el primer render del formulario ya la tiene).
  const [version, setVersion] = useState<Date | null>(null);
  if (consulta.data && version === null) {
    setVersion(consulta.data.actualizadoEn);
  }

  if (consulta.isLoading) return <Skeleton className="h-64 w-full" />;
  if (!consulta.data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">
          No se encontró la planificación.
        </p>
        <Button asChild variant="outline">
          <Link href={RUTA_PLANIFICACION}>
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </Button>
      </div>
    );
  }

  const cantidad = pacientes.data?.length ?? 0;

  return (
    <div className="space-y-4">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
      >
        <Link href={volver}>
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
      </Button>
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Pencil className="h-6 w-6 text-primary" /> Editar planificación
      </h1>
      {cantidad > 1 && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          Está asignada a {cantidad} pacientes: los cambios los ven todos. Si es
          para uno solo, duplicala y editá la copia.
        </p>
      )}
      <FormularioPlanificacion
        key={id}
        inicial={formularioDesdeGuardado(consulta.data)}
        guardando={actualizar.isPending}
        onCancelar={() => router.push(volver)}
        onGuardar={(contenido) =>
          actualizar.mutate(
            { ...contenido, id, actualizadoEn: version ?? undefined },
            { onSuccess: () => router.push(volver) },
          )
        }
      />
    </div>
  );
}
