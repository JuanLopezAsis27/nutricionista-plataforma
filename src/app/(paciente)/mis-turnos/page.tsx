"use client";

import { useTurnos } from "@/lib/hooks/useTurnos";
import { formatearFecha } from "@/lib/formato";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { EstadoBadge } from "@/componentes/comunes/EstadoBadge";

export default function PaginaMisTurnos() {
  const { porPaciente } = useTurnos();
  // Sin pacienteId: el servidor resuelve los turnos del paciente logueado.
  const turnos = porPaciente({});

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Mis turnos</h1>

      {turnos.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : turnos.isError ? (
        <p className="text-sm text-destructive">
          No se pudieron cargar tus turnos.
        </p>
      ) : (turnos.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Todavía no tenés turnos agendados.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {turnos.data!.map((turno) => (
            <Card key={turno.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">
                  {formatearFecha(turno.fecha)}
                </CardTitle>
                <EstadoBadge estado={turno.estado} />
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {turno.hora} hs · {turno.duracionMinutos} minutos
                {turno.notas && <p className="mt-1">{turno.notas}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
