"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  UserX,
  CalendarCheck,
  Wallet,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useEstadisticas } from "@/lib/hooks/useEstadisticas";
import { formatearMoneda, formatearFecha, hoyLocalISO } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/componentes/ui/dialog";
import { GraficoTurnosMensuales } from "@/componentes/estadisticas/GraficoTurnosMensuales";

/** Rangos: cuántos meses hacia atrás desde hoy incluye el análisis. */
const RANGOS = [
  { meses: 1, etiqueta: "Este mes" },
  { meses: 3, etiqueta: "3 meses" },
  { meses: 12, etiqueta: "12 meses" },
] as const;

type TipoDetalle = "EN_RIESGO" | "NUEVOS" | "ACTIVOS";

export default function PaginaEstadisticas() {
  const { obtener, detalle } = useEstadisticas();
  const [meses, setMeses] = useState<number>(3);
  const [desglose, setDesglose] = useState<{ tipo: TipoDetalle; titulo: string } | null>(null);

  // Fechas ancladas al día local (claves de query estables dentro del día).
  const hasta = new Date(hoyLocalISO());
  const desde =
    meses === 1
      ? new Date(Date.UTC(hasta.getUTCFullYear(), hasta.getUTCMonth(), 1))
      : new Date(Date.UTC(hasta.getUTCFullYear(), hasta.getUTCMonth() - (meses - 1), 1));

  const consulta = obtener({ desde, hasta });
  const datos = consulta.data;

  const lista = detalle(
    { tipo: desglose?.tipo ?? "EN_RIESGO", desde, hasta },
    { enabled: Boolean(desglose) },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Estadísticas</h1>
          <p className="text-sm text-muted-foreground">
            Actividad del consultorio en el período seleccionado.
          </p>
        </div>
        <div className="flex gap-1 rounded-md border p-0.5">
          {RANGOS.map((rango) => (
            <Button
              key={rango.meses}
              variant={meses === rango.meses ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setMeses(rango.meses)}
            >
              {rango.etiqueta}
            </Button>
          ))}
        </div>
      </div>

      {consulta.isError ? (
        <p className="text-sm text-destructive">No se pudieron cargar las estadísticas.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi
              icono={Users}
              titulo="Pacientes activos"
              valor={datos ? String(datos.pacientesActivos) : null}
              detalle="con seguimiento vigente"
              onVer={() => setDesglose({ tipo: "ACTIVOS", titulo: "Pacientes activos" })}
            />
            <Kpi
              icono={UserPlus}
              titulo="Nuevos en el período"
              valor={datos ? String(datos.pacientesNuevos) : null}
              detalle="altas dentro del rango"
              onVer={() => setDesglose({ tipo: "NUEVOS", titulo: "Nuevos en el período" })}
            />
            <Kpi
              icono={UserX}
              titulo="En riesgo de abandono"
              valor={datos ? String(datos.pacientesEnRiesgo) : null}
              detalle={
                datos ? `sin actividad hace +${datos.diasAbandono} días` : "sin actividad reciente"
              }
              alerta={Boolean(datos && datos.pacientesEnRiesgo > 0)}
              onVer={() => setDesglose({ tipo: "EN_RIESGO", titulo: "En riesgo de abandono" })}
            />
            <Kpi
              icono={CalendarCheck}
              titulo="Tasa de asistencia"
              valor={datos ? `${datos.tasaAsistencia}%` : null}
              detalle={
                datos
                  ? `${datos.turnos.completados} completados · ${datos.turnos.cancelados} cancelados`
                  : "completados vs. cancelados"
              }
            />
            <Kpi
              icono={Wallet}
              titulo="Ingresos cobrados"
              valor={datos ? formatearMoneda(datos.ingresos.cobrado) : null}
              detalle="turnos marcados como pagados"
            />
            <Kpi
              icono={Clock}
              titulo="Por cobrar"
              valor={datos ? formatearMoneda(datos.ingresos.pendiente) : null}
              detalle="con precio y sin pagar"
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Turnos por mes (últimos 6 meses)</CardTitle>
            </CardHeader>
            <CardContent className="pl-0 pr-3">
              <GraficoTurnosMensuales
                datos={datos?.serieMensual ?? []}
                cargando={consulta.isLoading}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Desglose de pacientes de una métrica */}
      <Dialog open={Boolean(desglose)} onOpenChange={(a) => !a && setDesglose(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{desglose?.titulo}</DialogTitle>
            <DialogDescription>
              {desglose?.tipo === "EN_RIESGO"
                ? "Pacientes activos sin turnos ni registros recientes."
                : desglose?.tipo === "NUEVOS"
                  ? "Pacientes dados de alta en el período."
                  : "Todos los pacientes activos."}
            </DialogDescription>
          </DialogHeader>
          {lista.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (lista.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hay pacientes en esta categoría.
            </p>
          ) : (
            <ul className="max-h-80 divide-y overflow-y-auto">
              {lista.data!.map((paciente) => (
                <li key={paciente.id}>
                  <Link
                    href={`/dashboard/pacientes/${paciente.id}`}
                    className="flex items-center justify-between gap-2 py-2.5 text-sm hover:text-primary"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {paciente.nombre} {paciente.apellido}
                      </span>
                      {paciente.referencia && (
                        <span className="text-xs text-muted-foreground">
                          {desglose?.tipo === "EN_RIESGO" ? "Última actividad: " : "Alta: "}
                          {formatearFecha(paciente.referencia)}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({
  icono: Icono,
  titulo,
  valor,
  detalle,
  alerta = false,
  onVer,
}: {
  icono: typeof Users;
  titulo: string;
  valor: string | null;
  detalle: string;
  alerta?: boolean;
  onVer?: () => void;
}) {
  return (
    <Card
      className={onVer ? "cursor-pointer transition-colors hover:border-primary/50" : undefined}
      onClick={onVer}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
        <Icono className={alerta ? "h-5 w-5 text-destructive" : "h-5 w-5 text-muted-foreground"} />
      </CardHeader>
      <CardContent>
        {valor == null ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="text-3xl font-bold tabular-nums">{valor}</p>
        )}
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          {detalle}
          {onVer && <ChevronRight className="h-3 w-3" />}
        </p>
      </CardContent>
    </Card>
  );
}
