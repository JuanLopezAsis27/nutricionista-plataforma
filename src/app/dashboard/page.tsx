"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users, CalendarDays, CalendarClock, BellRing } from "lucide-react";
import { usePacientes } from "@/lib/hooks/usePacientes";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { PanelAlertas } from "@/componentes/seguimiento/PanelAlertas";
import { AccesosRapidos } from "@/componentes/dashboard/AccesosRapidos";
import { MensajesSinLeer } from "@/componentes/dashboard/MensajesSinLeer";
import { ResumenDelMes } from "@/componentes/dashboard/ResumenDelMes";
import { GraficoTurnosSemanales } from "@/componentes/dashboard/GraficoTurnosSemanales";
import { ACENTOS, type ClaveAcento } from "@/componentes/dashboard/acentos";
import { aFechaISO } from "@/lib/formato";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { EstadoBadge } from "@/componentes/comunes/EstadoBadge";
import { SelectorEstado } from "@/componentes/turnos/SelectorEstado";

/**
 * Una tarjeta de métrica.
 *
 * El acento es el mismo siempre para cada métrica (ver `acentos.ts`): el color
 * es para encontrar la tarjeta de un vistazo, no para decir si el número está
 * bien o mal —eso lo dice el rótulo—.
 */
function Metrica({
  titulo,
  valor,
  icono: Icono,
  acento,
  cargando,
}: {
  titulo: string;
  valor: number;
  icono: typeof Users;
  acento: ClaveAcento;
  cargando: boolean;
}) {
  const color = ACENTOS[acento];
  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-1 ${color.barra}`}
      />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {titulo}
        </CardTitle>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${color.chip}`}
        >
          <Icono className={`h-5 w-5 ${color.tinta}`} />
        </span>
      </CardHeader>
      <CardContent>
        {cargando ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <p className="text-3xl font-bold tracking-tight">{valor}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function PaginaDashboard() {
  const { listar: listarPacientes } = usePacientes();
  const { listar: listarTurnos, actualizarEstado } = useTurnos();

  const pacientes = listarPacientes({ pagina: 1, porPagina: 100 });
  const turnos = listarTurnos({});

  // El día se fija al montar y no en cada render: leer el reloj en el cuerpo
  // del componente es impuro, y con SSR el servidor y el cliente pueden caer a
  // los dos lados de la medianoche y renderizar dashboards distintos.
  const [hoy] = useState(() => aFechaISO(new Date()));

  const mapaPacientes = useMemo(() => {
    const mapa = new Map<string, string>();
    pacientes.data?.pacientes.forEach((p) =>
      mapa.set(p.id, `${p.nombre} ${p.apellido}`),
    );
    return mapa;
  }, [pacientes.data]);

  const { turnosHoy, cantidadSemana, sinConfirmar } = useMemo(() => {
    const lista = turnos.data ?? [];
    // Derivado de `hoy`, no de un segundo reloj: si se leyeran por separado,
    // la ventana podría abarcar 6 u 8 días al cruzar la medianoche.
    const finSemana = aFechaISO(
      new Date(new Date(hoy).getTime() + 7 * 86_400_000),
    );
    const turnosHoy = lista
      .filter((t) => aFechaISO(t.fecha) === hoy)
      .sort((a, b) => a.hora.localeCompare(b.hora));
    const cantidadSemana = lista.filter((t) => {
      const f = aFechaISO(t.fecha);
      return f >= hoy && f <= finSemana && t.estado !== "CANCELADO";
    }).length;
    // Turnos futuros que el paciente todavía no confirmó: es la métrica
    // ACCIONABLE del día —hay algo que hacer con cada uno— y por eso ocupa el
    // lugar que antes tenía "Planes vigentes", que contaba los planes del
    // consultorio y no los pacientes que siguen uno.
    const sinConfirmar = lista.filter(
      (t) => aFechaISO(t.fecha) >= hoy && t.estado === "PENDIENTE",
    ).length;
    return { turnosHoy, cantidadSemana, sinConfirmar };
  }, [turnos.data, hoy]);

  const cargandoMetricas = pacientes.isLoading || turnos.isLoading;

  return (
    <div className="space-y-6">
      <AccesosRapidos hoy={hoy} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica
          // El listado excluye a los archivados salvo que se pidan, así que
          // este total ya son los pacientes vigentes.
          titulo="Pacientes activos"
          valor={pacientes.data?.total ?? 0}
          icono={Users}
          acento="verde"
          cargando={pacientes.isLoading}
        />
        <Metrica
          titulo="Turnos de hoy"
          valor={turnosHoy.length}
          icono={CalendarDays}
          acento="azul"
          cargando={turnos.isLoading}
        />
        <Metrica
          titulo="Próximos (7 días)"
          valor={cantidadSemana}
          icono={CalendarClock}
          acento="violeta"
          cargando={turnos.isLoading}
        />
        <Metrica
          titulo="Sin confirmar"
          valor={sinConfirmar}
          icono={BellRing}
          acento="ambar"
          cargando={turnos.isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Turnos de hoy</CardTitle>
          </CardHeader>
          <CardContent>
            {cargandoMetricas ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : turnos.isError ? (
              <p className="text-sm text-destructive">
                No se pudieron cargar los turnos.
              </p>
            ) : turnosHoy.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay turnos para hoy.
              </p>
            ) : (
              <ul className="divide-y">
                {turnosHoy.map((turno) => (
                  <li
                    key={turno.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-14 font-mono text-sm">
                        {turno.hora}
                      </span>
                      <Link
                        href={`/dashboard/pacientes/${turno.pacienteId}`}
                        className="font-medium hover:underline"
                      >
                        {mapaPacientes.get(turno.pacienteId) ?? "Paciente"}
                      </Link>
                    </div>
                    <div className="flex items-center gap-3">
                      <EstadoBadge estado={turno.estado} />
                      <SelectorEstado
                        estadoActual={turno.estado}
                        deshabilitado={actualizarEstado.isPending}
                        onCambiar={(estado) =>
                          actualizarEstado.mutate({ id: turno.id, estado })
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <MensajesSinLeer />
      </div>

      <ResumenDelMes hoy={hoy} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            Turnos por semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GraficoTurnosSemanales
            turnos={turnos.data ?? []}
            hoy={hoy}
            cargando={turnos.isLoading}
          />
        </CardContent>
      </Card>

      <PanelAlertas />
    </div>
  );
}
