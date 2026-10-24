"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Medal,
  Pencil,
  Trash2,
  UserPlus,
  Users,
  X,
  Trophy,
} from "lucide-react";
import { usePlanificacionDeportiva } from "@/lib/hooks/usePlanificacionDeportiva";
import { formatearFecha } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { VistaPlanificacion } from "@/componentes/planificacion-deportiva/VistaPlanificacion";
import { DialogoAsignarPlanificacion } from "@/componentes/planificacion-deportiva/DialogosPlanificacion";
import {
  RUTA_PLANIFICACION,
  rutaDeporteDelPaciente,
  rutaEditarPlanificacion,
  rutaPlanificacion,
} from "@/componentes/planificacion-deportiva/rutas";

/**
 * La página de una planificación: la carrera, los números por hora, la línea
 * de tiempo de ingestas y a qué pacientes está asignada (y para qué
 * competencia). Lee de la query por id: al editar, la invalidación la
 * refresca sola.
 */
export default function PaginaPlanificacion() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { obtener, pacientesDe, eliminar, duplicar, desasignar } =
    usePlanificacionDeportiva();
  const consulta = obtener({ id });
  const pacientes = pacientesDe({ id });
  const [asignar, setAsignar] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

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

  const p = consulta.data;
  const asignados = pacientes.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        >
          <Link href={RUTA_PLANIFICACION}>
            <ArrowLeft className="h-4 w-4" /> Planificación deportiva
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setAsignar(true)}>
            <UserPlus className="h-4 w-4" /> Asignar
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={duplicar.isPending}
            onClick={() =>
              duplicar.mutate(
                { id },
                {
                  onSuccess: (copia) =>
                    router.push(rutaPlanificacion(copia.id)),
                },
              )
            }
          >
            <Copy className="h-4 w-4" /> Duplicar
          </Button>
          <Button asChild size="sm">
            <Link href={rutaEditarPlanificacion(id)}>
              <Pencil className="h-4 w-4" /> Editar
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmarEliminar(true)}
          >
            <Trash2 className="h-4 w-4" /> Eliminar
          </Button>
        </div>
      </div>

      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Medal className="h-6 w-6 text-primary" /> {p.nombre}
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <VistaPlanificacion planificacion={p} />

        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" /> Pacientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {asignados.length === 0 ? (
              <p className="text-muted-foreground">
                No está asignada a ningún paciente: nadie la ve en su portal.
              </p>
            ) : (
              <ul className="divide-y">
                {asignados.map((a) => (
                  <li
                    key={a.pacienteId}
                    className="flex items-start justify-between gap-2 py-2"
                  >
                    <div className="min-w-0">
                      <Link
                        href={rutaDeporteDelPaciente(a.pacienteId)}
                        className="font-medium hover:underline"
                      >
                        {a.nombre} {a.apellido}
                      </Link>
                      {a.competencia && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Trophy className="h-3 w-3" />
                          {a.competencia.nombre} ·{" "}
                          {formatearFecha(a.competencia.fecha)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      title="Quitársela"
                      disabled={desasignar.isPending}
                      onClick={() =>
                        desasignar.mutate({
                          planificacionId: id,
                          pacienteId: a.pacienteId,
                        })
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <DialogoAsignarPlanificacion
        abierto={asignar}
        planificacion={p}
        onCerrar={() => setAsignar(false)}
      />
      <ModalConfirmacion
        abierto={confirmarEliminar}
        titulo="Eliminar planificación"
        descripcion={
          asignados.length > 0
            ? `Está asignada a ${asignados.length} ${asignados.length === 1 ? "paciente" : "pacientes"}: deja de aparecer en su portal. ¿Eliminarla?`
            : `¿Eliminar «${p.nombre}»? Esta acción no se puede deshacer.`
        }
        cargando={eliminar.isPending}
        onCancelar={() => setConfirmarEliminar(false)}
        onConfirmar={() =>
          eliminar.mutate(
            { id },
            { onSuccess: () => router.push(RUTA_PLANIFICACION) },
          )
        }
      />
    </div>
  );
}
