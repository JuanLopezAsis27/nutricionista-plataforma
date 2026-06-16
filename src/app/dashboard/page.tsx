"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Users, CalendarDays, CalendarClock, Salad } from "lucide-react";
import { usePacientes } from "@/lib/hooks/usePacientes";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { useDietas } from "@/lib/hooks/useDietas";
import { aFechaISO } from "@/lib/formato";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { EstadoBadge } from "@/componentes/comunes/EstadoBadge";
import { SelectorEstado } from "@/componentes/turnos/SelectorEstado";

function Metrica({
  titulo,
  valor,
  icono: Icono,
  cargando,
}: {
  titulo: string;
  valor: number;
  icono: typeof Users;
  cargando: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
        <Icono className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {cargando ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-3xl font-bold">{valor}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function PaginaDashboard() {
  const { listar: listarPacientes } = usePacientes();
  const { listar: listarTurnos, actualizarEstado } = useTurnos();
  const { listar: listarDietas } = useDietas();

  const pacientes = listarPacientes({ pagina: 1, porPagina: 100 });
  const turnos = listarTurnos({});
  const dietas = listarDietas();

  const hoy = aFechaISO(new Date());

  const mapaPacientes = useMemo(() => {
    const mapa = new Map<string, string>();
    pacientes.data?.pacientes.forEach((p) => mapa.set(p.id, `${p.nombre} ${p.apellido}`));
    return mapa;
  }, [pacientes.data]);

  const { turnosHoy, cantidadSemana } = useMemo(() => {
    const lista = turnos.data ?? [];
    const finSemana = aFechaISO(new Date(Date.now() + 7 * 86_400_000));
    const turnosHoy = lista
      .filter((t) => aFechaISO(t.fecha) === hoy)
      .sort((a, b) => a.hora.localeCompare(b.hora));
    const cantidadSemana = lista.filter((t) => {
      const f = aFechaISO(t.fecha);
      return f >= hoy && f <= finSemana && t.estado !== "CANCELADO";
    }).length;
    return { turnosHoy, cantidadSemana };
  }, [turnos.data, hoy]);

  const cargandoMetricas = pacientes.isLoading || turnos.isLoading || dietas.isLoading;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica
          titulo="Pacientes"
          valor={pacientes.data?.total ?? 0}
          icono={Users}
          cargando={pacientes.isLoading}
        />
        <Metrica
          titulo="Turnos de hoy"
          valor={turnosHoy.length}
          icono={CalendarDays}
          cargando={turnos.isLoading}
        />
        <Metrica
          titulo="Próximos (7 días)"
          valor={cantidadSemana}
          icono={CalendarClock}
          cargando={turnos.isLoading}
        />
        <Metrica
          titulo="Dietas creadas"
          valor={dietas.data?.length ?? 0}
          icono={Salad}
          cargando={dietas.isLoading}
        />
      </div>

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
            <p className="text-sm text-destructive">No se pudieron cargar los turnos.</p>
          ) : turnosHoy.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay turnos para hoy.</p>
          ) : (
            <ul className="divide-y">
              {turnosHoy.map((turno) => (
                <li key={turno.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-4">
                    <span className="w-14 font-mono text-sm">{turno.hora}</span>
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
    </div>
  );
}
