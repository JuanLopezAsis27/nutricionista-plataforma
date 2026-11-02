"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  Dumbbell,
  Medal,
  Link2,
} from "lucide-react";
import type { CompetenciaSalidaDto } from "@/aplicacion/dtos/deportivo.dto";
import { useDeportivo } from "@/lib/hooks/useDeportivo";
import { esFechaPasada, formatearFecha } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { ETIQUETA_NIVEL, ETIQUETA_FASE } from "./seccion/comun";
import { FormularioPerfil } from "./seccion/FormularioPerfil";
import { FormularioCompetencia } from "./seccion/FormularioCompetencia";
import { usePlanificacionDeportiva } from "@/lib/hooks/usePlanificacionDeportiva";
import { SeccionPlanificacionesDelPaciente } from "@/componentes/planificacion-deportiva/SeccionPlanificacionesDelPaciente";
import { DialogoAsignarPlanificacion } from "@/componentes/planificacion-deportiva/DialogosPlanificacion";
import { planificacionSegunPerfil } from "@/componentes/planificacion-deportiva/segunPerfil";
import {
  rutaDeporteDelPaciente,
  rutaNuevaPlanificacion,
  rutaPlanificacion,
} from "@/componentes/planificacion-deportiva/rutas";

// Los esquemas se reexportan porque `coherencia-formularios-2.test.ts` los
// importa desde acá, que sigue siendo el punto de entrada del módulo.
export { esquemaPerfil, esquemaCompetencia } from "./seccion/esquemas";

export function SeccionDeportiva({ pacienteId }: { pacienteId: string }) {
  const { obtenerPerfil, listarCompetencias, eliminarCompetencia } =
    useDeportivo();
  const consultaPerfil = obtenerPerfil({ pacienteId });
  const consultaCompetencias = listarCompetencias({ pacienteId });
  // Qué competencias ya tienen su planificación (migración 94): la fila lo
  // dice y lleva a ella, en vez de ofrecer planificarla otra vez.
  const { delPaciente } = usePlanificacionDeportiva();
  const planificaciones = delPaciente({ pacienteId }).data ?? [];
  const planificacionDe = (competenciaId: string) =>
    planificaciones.find((p) => p.competencia?.id === competenciaId)
      ?.planificacion ?? null;

  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [compAbierta, setCompAbierta] = useState(false);
  const [compEditar, setCompEditar] = useState<CompetenciaSalidaDto | null>(
    null,
  );
  const [compEliminar, setCompEliminar] = useState<CompetenciaSalidaDto | null>(
    null,
  );
  // La competencia para la que se asigna una planificación que ya existe.
  const [compAsignar, setCompAsignar] = useState<CompetenciaSalidaDto | null>(
    null,
  );

  const perfil = consultaPerfil.data ?? null;
  const competencias = consultaCompetencias.data ?? [];
  // Qué se puede planificar lo dice su deporte (migración 98): si no tiene
  // planificación, las competencias no ofrecen planificar ni asignar.
  const puedePlanificar =
    !consultaPerfil.isLoading &&
    planificacionSegunPerfil(perfil).estado !== "NO_DISPONIBLE";

  return (
    <div className="space-y-8">
      {/* Perfil deportivo */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold">
            <Dumbbell className="h-4 w-4 text-primary" /> Perfil deportivo
          </h3>
          <Button
            size="sm"
            variant={perfil ? "outline" : "default"}
            onClick={() => setPerfilAbierto(true)}
          >
            <Pencil className="h-4 w-4" />
            {perfil ? "Editar" : "Cargar perfil"}
          </Button>
        </div>

        {consultaPerfil.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !perfil ? (
          <p className="text-sm text-muted-foreground">
            El paciente no tiene perfil deportivo cargado. Cargalo para adaptar
            su plan y el asistente.
          </p>
        ) : (
          <div className="grid gap-2 rounded-md border p-4 text-sm sm:grid-cols-2">
            <Dato etiqueta="Deporte" valor={perfil.deporte.nombre} />
            <Dato etiqueta="Disciplina" valor={perfil.disciplina} />
            <Dato etiqueta="Nivel" valor={ETIQUETA_NIVEL[perfil.nivel]} />
            <Dato etiqueta="Fase" valor={ETIQUETA_FASE[perfil.fase]} />
            <Dato
              etiqueta="Entrenamiento"
              valor={
                [
                  perfil.diasEntrenamientoSemana != null &&
                    `${perfil.diasEntrenamientoSemana} días/sem`,
                  perfil.horasSemana != null && `${perfil.horasSemana} h/sem`,
                ]
                  .filter(Boolean)
                  .join(" · ") || null
              }
            />
            <Dato
              etiqueta="Peso de categoría"
              valor={
                perfil.pesoCategoriaKg != null
                  ? `${perfil.pesoCategoriaKg} kg`
                  : null
              }
            />
            <Dato etiqueta="Posición" valor={perfil.posicion} />
            <Dato etiqueta="Objetivo" valor={perfil.objetivo} />
            {perfil.notas && (
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">Notas: </span>
                {perfil.notas}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Competencias */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold">
            <CalendarDays className="h-4 w-4 text-primary" /> Calendario de
            competencias
          </h3>
          <Button
            size="sm"
            onClick={() => {
              setCompEditar(null);
              setCompAbierta(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>

        {consultaCompetencias.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : competencias.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin competencias cargadas.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {competencias.map((comp) => {
              const pasada = esFechaPasada(comp.fecha);
              const planificada = planificacionDe(comp.id);
              return (
                <li
                  key={comp.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      <Trophy className="h-4 w-4 text-primary" />
                      {comp.nombre}
                      <Badge
                        variant={
                          comp.importancia === "A" ? "default" : "secondary"
                        }
                      >
                        {comp.importancia}
                      </Badge>
                      {pasada && <Badge variant="outline">Finalizada</Badge>}
                    </p>
                    <p className="text-muted-foreground">
                      {formatearFecha(comp.fecha)}
                      {comp.lugar && ` · ${comp.lugar}`}
                      {comp.objetivo && ` · Objetivo: ${comp.objetivo}`}
                      {comp.resultado && ` · Resultado: ${comp.resultado}`}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1">
                    {planificada ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={rutaPlanificacion(planificada.id)}>
                          <Medal className="h-4 w-4" /> Ver planificación
                        </Link>
                      </Button>
                    ) : (
                      !pasada &&
                      puedePlanificar && (
                        <>
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={rutaNuevaPlanificacion({
                                pacienteId,
                                competenciaId: comp.id,
                                volver: rutaDeporteDelPaciente(pacienteId),
                              })}
                            >
                              <Medal className="h-4 w-4" /> Planificar
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Asignarle una planificación que ya existe"
                            onClick={() => setCompAsignar(comp)}
                          >
                            <Link2 className="h-4 w-4" /> Asignar existente
                          </Button>
                        </>
                      )
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      onClick={() => {
                        setCompEditar(comp);
                        setCompAbierta(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Eliminar"
                      onClick={() => setCompEliminar(comp)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Planificaciones deportivas: lo que se come en cada competencia. */}
      <SeccionPlanificacionesDelPaciente pacienteId={pacienteId} />

      {/* Se monta de nuevo por competencia: arranca con ESA elegida. */}
      <DialogoAsignarPlanificacion
        key={compAsignar?.id ?? "ninguna"}
        abierto={compAsignar !== null}
        pacienteId={pacienteId}
        competenciaIdInicial={compAsignar?.id ?? null}
        onCerrar={() => setCompAsignar(null)}
      />

      {/* Diálogos */}
      <Dialog open={perfilAbierto} onOpenChange={setPerfilAbierto}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {perfil ? "Editar perfil deportivo" : "Cargar perfil deportivo"}
            </DialogTitle>
          </DialogHeader>
          <FormularioPerfil
            pacienteId={pacienteId}
            perfil={perfil}
            onTerminado={() => setPerfilAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={compAbierta} onOpenChange={setCompAbierta}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {compEditar ? "Editar competencia" : "Agregar competencia"}
            </DialogTitle>
          </DialogHeader>
          <FormularioCompetencia
            pacienteId={pacienteId}
            competencia={compEditar}
            onTerminado={() => setCompAbierta(false)}
          />
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={Boolean(compEliminar)}
        titulo="Eliminar competencia"
        descripcion={`¿Eliminar «${compEliminar?.nombre}»? Esta acción no se puede deshacer.`}
        cargando={eliminarCompetencia.isPending}
        onCancelar={() => setCompEliminar(null)}
        onConfirmar={() => {
          if (!compEliminar) return;
          eliminarCompetencia.mutate(
            { id: compEliminar.id },
            { onSuccess: () => setCompEliminar(null) },
          );
        }}
      />
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <p>
      <span className="text-muted-foreground">{etiqueta}: </span>
      {valor ?? "—"}
    </p>
  );
}
