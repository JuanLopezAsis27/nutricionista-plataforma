"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Dumbbell, Medal, Trophy, User } from "lucide-react";
import { usePlanificacionDeportiva } from "@/lib/hooks/usePlanificacionDeportiva";
import { useDeportivo } from "@/lib/hooks/useDeportivo";
import { usePacientes } from "@/lib/hooks/usePacientes";
import { useSeguimiento } from "@/lib/hooks/useSeguimiento";
import { formatearFecha } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { FormularioPlanificacion } from "@/componentes/planificacion-deportiva/FormularioPlanificacion";
import { formularioVacio } from "@/componentes/planificacion-deportiva/formulario/esquema";
import {
  RUTA_PLANIFICACION,
  rutaDeporteDelPaciente,
  rutaPlanificacion,
  volverSeguro,
} from "@/componentes/planificacion-deportiva/rutas";
import {
  planificacionSegunPerfil,
  textoSinPlanificacion,
} from "@/componentes/planificacion-deportiva/segunPerfil";

/**
 * Alta de una planificación de carrera.
 *
 * Con `?pacienteId=` se crea DESDE LA FICHA: va a la carpeta con el nombre del
 * paciente (la primera vez se crea) y queda asignada a él; con
 * `&competenciaId=`, atada a esa competencia de su calendario, y el nombre
 * arranca con el de la competencia. Sin paciente es una planificación general
 * (en la carpeta abierta, si vino `grupoId`).
 *
 * El peso del deportista (para la cafeína en mg/kg) arranca con el último peso
 * del paciente —el de su última antropometría o, si es más nuevo, el que anotó
 * en el diario (`informeProgreso`)— y se puede cambiar.
 *
 * Desde la ficha, la planificación arranca según su PERFIL DEPORTIVO
 * (migración 98): la modalidad es la que le corresponde a su deporte (un
 * paciente de trail, una carrera de trail; se puede cambiar). Si su deporte
 * todavía no tiene planificación, en vez del formulario se lo dice. Cuando
 * haya otros tipos, es acá donde `definicion.tipo` elige el formulario.
 */
export default function PaginaNuevaPlanificacion() {
  const buscar = useSearchParams();
  const router = useRouter();
  const pacienteId = buscar.get("pacienteId");
  const competenciaId = buscar.get("competenciaId");
  const grupoId = buscar.get("grupoId");
  const { crear, crearParaPaciente } = usePlanificacionDeportiva();
  const { obtenerPorId } = usePacientes();
  const { listarCompetencias, obtenerPerfil } = useDeportivo();
  const perfil = obtenerPerfil(
    { pacienteId: pacienteId ?? "" },
    { enabled: Boolean(pacienteId) },
  );
  const { informeProgreso } = useSeguimiento();
  // El rango se fija una sola vez: con un `new Date()` por render la clave
  // de la query cambiaría en cada uno y no terminaría nunca de cargar.
  const [rango] = useState(() => {
    const hasta = new Date();
    const desde = new Date(hasta);
    desde.setFullYear(desde.getFullYear() - 1);
    return { desde, hasta };
  });
  const progreso = informeProgreso(
    { pacienteId: pacienteId ?? "", ...rango },
    { enabled: Boolean(pacienteId) },
  );

  const paciente = obtenerPorId(
    { id: pacienteId ?? "" },
    { enabled: Boolean(pacienteId) },
  );
  const competencias = listarCompetencias(
    { pacienteId: pacienteId ?? "" },
    { enabled: Boolean(pacienteId && competenciaId) },
  );
  const competencia =
    (competencias.data ?? []).find((c) => c.id === competenciaId) ?? null;

  const volver =
    volverSeguro(buscar.get("volver")) ??
    (pacienteId ? rutaDeporteDelPaciente(pacienteId) : RUTA_PLANIFICACION);

  const cargando =
    (pacienteId &&
      (paciente.isLoading || progreso.isLoading || perfil.isLoading)) ||
    (competenciaId && competencias.isLoading);
  if (cargando) return <Skeleton className="h-64 w-full" />;

  const segunPerfil = pacienteId
    ? planificacionSegunPerfil(perfil.data)
    : ({ estado: "SIN_PERFIL" } as const);
  const modalidadInicial =
    segunPerfil.estado === "DISPONIBLE"
      ? (segunPerfil.definicion.carrera?.modalidad ?? "CALLE")
      : "CALLE";

  const nombreInicial = competencia
    ? competencia.nombre
    : paciente.data
      ? `Carrera de ${paciente.data.nombre} ${paciente.data.apellido}`
      : "";

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
        <Medal className="h-6 w-6 text-primary" /> Nueva planificación de
        carrera
      </h1>

      {segunPerfil.estado === "NO_DISPONIBLE" ? (
        <div className="space-y-3 rounded-md border border-dashed p-4 text-sm">
          <p>{textoSinPlanificacion(segunPerfil.deporte)}</p>
          <p className="text-muted-foreground">
            Si compite en otro deporte, cambiá su perfil deportivo. Qué
            planificación le corresponde a cada deporte lo define el
            administrador de la plataforma.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={volver}>
              <ArrowLeft className="h-4 w-4" /> Volver
            </Link>
          </Button>
        </div>
      ) : (
        <FormularioPlanificacion
          inicial={formularioVacio(
            nombreInicial,
            progreso.data?.pesoActual ?? null,
            modalidadInicial,
          )}
          guardando={crear.isPending || crearParaPaciente.isPending}
          onCancelar={() => router.push(volver)}
          encabezado={
            paciente.data ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border bg-muted/30 p-3 text-sm">
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-primary" />
                  Para{" "}
                  <strong>
                    {paciente.data.nombre} {paciente.data.apellido}
                  </strong>
                </span>
                {competencia && (
                  <span className="flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-primary" />
                    {competencia.nombre} · {formatearFecha(competencia.fecha)}
                  </span>
                )}
                {segunPerfil.estado === "DISPONIBLE" && (
                  <span className="flex items-center gap-1.5">
                    <Dumbbell className="h-4 w-4 text-primary" />
                    {segunPerfil.deporte}: arranca como{" "}
                    {segunPerfil.definicion.etiqueta}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  Se guarda en su carpeta y la ve en su portal.
                </span>
              </div>
            ) : null
          }
          onGuardar={(contenido) => {
            if (pacienteId) {
              crearParaPaciente.mutate(
                { ...contenido, pacienteId, competenciaId },
                { onSuccess: () => router.push(volver) },
              );
            } else {
              crear.mutate(
                { ...contenido, grupoId },
                {
                  onSuccess: (creada) =>
                    router.push(rutaPlanificacion(creada.id)),
                },
              );
            }
          }}
        />
      )}
    </div>
  );
}
