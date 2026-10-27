"use client";

import { useState } from "react";
import Link from "next/link";
import { Medal, Plus, Link2, Eye, Pencil, X, Trophy } from "lucide-react";
import { ETIQUETA_MODALIDAD_CARRERA } from "@/dominio/entidades/PlanificacionDeportiva";
import { usePlanificacionDeportiva } from "@/lib/hooks/usePlanificacionDeportiva";
import { useDeportivo } from "@/lib/hooks/useDeportivo";
import { formatearFecha } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { DialogoAsignarPlanificacion } from "./DialogosPlanificacion";
import {
  rutaDeporteDelPaciente,
  rutaEditarPlanificacion,
  rutaNuevaPlanificacion,
  rutaPlanificacion,
} from "./rutas";
import { numero, textoDuracion } from "./presentacion";
import { planificacionSegunPerfil, textoSinPlanificacion } from "./segunPerfil";

/**
 * Las planificaciones deportivas del paciente, en su pestaña «Deporte», junto
 * al perfil y al calendario de competencias: es lo que las une. Cada una dice
 * para qué competencia es (si es para una), y se crean desde acá —van a la
 * carpeta del paciente en el módulo— o se asigna una que ya existe.
 *
 * Están separadas de la pestaña «Planes» a propósito: un plan nutricional es
 * la alimentación de todos los días; esto es lo que se come en una carrera.
 *
 * Lo que se ofrece sigue al PERFIL DEPORTIVO (migración 98): si su deporte
 * tiene planificación, «Nueva» arranca con esa; si no tiene (fútbol, por
 * ahora), no se ofrece crear ni asignar, y las que ya tiene se siguen viendo.
 */
export function SeccionPlanificacionesDelPaciente({
  pacienteId,
}: {
  pacienteId: string;
}) {
  const { delPaciente, desasignar } = usePlanificacionDeportiva();
  const consulta = delPaciente({ pacienteId });
  const { obtenerPerfil } = useDeportivo();
  const perfil = obtenerPerfil({ pacienteId });
  const segunPerfil = planificacionSegunPerfil(perfil.data);
  const puedePlanificar =
    !perfil.isLoading && segunPerfil.estado !== "NO_DISPONIBLE";
  const [asignar, setAsignar] = useState(false);
  const [aQuitar, setAQuitar] = useState<{
    id: string;
    nombre: string;
  } | null>(null);
  const volver = rutaDeporteDelPaciente(pacienteId);
  const planificaciones = consulta.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <Medal className="h-4 w-4 text-primary" /> Planificaciones deportivas
        </h3>
        {puedePlanificar && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAsignar(true)}
            >
              <Link2 className="h-4 w-4" /> Asignar existente
            </Button>
            <Button asChild size="sm">
              <Link href={rutaNuevaPlanificacion({ pacienteId, volver })}>
                <Plus className="h-4 w-4" /> Nueva
              </Link>
            </Button>
          </div>
        )}
      </div>

      {segunPerfil.estado === "DISPONIBLE" && (
        <p className="text-xs text-muted-foreground">
          Según su perfil ({segunPerfil.deporte}), las nuevas arrancan como{" "}
          <strong>{segunPerfil.definicion.etiqueta}</strong>.
        </p>
      )}
      {segunPerfil.estado === "SIN_PERFIL" && !perfil.isLoading && (
        <p className="text-xs text-muted-foreground">
          Cargá su perfil deportivo y la planificación va a arrancar según su
          deporte.
        </p>
      )}
      {segunPerfil.estado === "NO_DISPONIBLE" && (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          {textoSinPlanificacion(segunPerfil.deporte)}
        </p>
      )}

      {consulta.isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : planificaciones.length === 0 ? (
        puedePlanificar && (
          <p className="text-sm text-muted-foreground">
            Sin planificaciones. Creá una para una competencia de su calendario
            (botón «Planificar» de cada competencia) o una general.
          </p>
        )
      ) : (
        <ul className="divide-y rounded-md border">
          {planificaciones.map(({ planificacion: p, competencia }) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
            >
              <div className="min-w-0 space-y-0.5">
                <Link
                  href={rutaPlanificacion(p.id)}
                  className="font-medium hover:underline"
                >
                  {p.nombre}
                </Link>
                <p className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
                  {p.carrera && (
                    <>
                      <Badge variant="secondary">
                        {ETIQUETA_MODALIDAD_CARRERA[p.carrera.modalidad]}
                      </Badge>
                      {numero(p.carrera.distanciaKm, " km")} ·{" "}
                      {textoDuracion(p.carrera.duracionEstimadaMin)} ·{" "}
                      {p.ingestas.length}{" "}
                      {p.ingestas.length === 1 ? "ingesta" : "ingestas"}
                    </>
                  )}
                </p>
                {competencia && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Trophy className="h-3 w-3" /> {competencia.nombre} ·{" "}
                    {formatearFecha(competencia.fecha)}
                  </p>
                )}
              </div>
              <span className="flex shrink-0 gap-1">
                <Button asChild variant="ghost" size="icon" title="Ver">
                  <Link href={rutaPlanificacion(p.id)}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon" title="Editar">
                  <Link href={rutaEditarPlanificacion(p.id, volver)}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Quitársela"
                  onClick={() => setAQuitar({ id: p.id, nombre: p.nombre })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <DialogoAsignarPlanificacion
        abierto={asignar}
        pacienteId={pacienteId}
        onCerrar={() => setAsignar(false)}
      />
      <ModalConfirmacion
        abierto={aQuitar !== null}
        titulo="Quitar planificación"
        descripcion={`«${aQuitar?.nombre}» deja de aparecer en su portal. La planificación sigue en el módulo de planificación deportiva.`}
        textoConfirmar="Quitar"
        cargando={desasignar.isPending}
        onCancelar={() => setAQuitar(null)}
        onConfirmar={() => {
          if (!aQuitar) return;
          desasignar.mutate(
            { planificacionId: aQuitar.id, pacienteId },
            { onSuccess: () => setAQuitar(null) },
          );
        }}
      />
    </div>
  );
}
