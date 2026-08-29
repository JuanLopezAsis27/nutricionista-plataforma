"use client";

import {
  Users,
  UserPlus,
  UserX,
  CalendarCheck,
  AlertTriangle,
  Activity,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import { useEstadisticas } from "@/lib/hooks/useEstadisticas";
import { hoyLocalISO } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import type { InsightPacienteDto } from "@/aplicacion/dtos/ia.dto";

/**
 * Panel de KPIs del Análisis IA: combina métricas de la práctica (del read-model
 * de estadísticas, siempre disponibles) con un resumen de lo que detectó el
 * análisis predictivo (agregado de los insights). Las tarjetas de IA solo
 * aparecen cuando el análisis está activo (con el ml-servicio); si no, se muestran
 * solo las de la práctica.
 */
export function PanelKpisAnalisis({
  insights,
  insightsActivo,
}: {
  insights: InsightPacienteDto[];
  insightsActivo: boolean;
}) {
  const { obtener } = useEstadisticas();
  // Rango: últimos 3 meses (anclado al día local para claves de query estables).
  const hasta = new Date(hoyLocalISO());
  const desde = new Date(
    Date.UTC(hasta.getUTCFullYear(), hasta.getUTCMonth() - 2, 1),
  );
  const est = obtener({ desde, hasta });
  const d = est.data;

  const porTipo = (tipo: string) =>
    insights.filter((i) => i.tipo === tipo).length;
  const criticas = insights.filter((i) => i.severidad === "CRITICO").length;

  return (
    <div className="space-y-3">
      {/* KPIs de la práctica (siempre) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          icono={Users}
          titulo="Pacientes activos"
          valor={d ? String(d.pacientesActivos) : null}
          detalle="con seguimiento"
        />
        <KpiTile
          icono={UserPlus}
          titulo="Nuevos (3 meses)"
          valor={d ? String(d.pacientesNuevos) : null}
          detalle="altas en el período"
        />
        <KpiTile
          icono={CalendarCheck}
          titulo="Asistencia"
          valor={d ? `${d.tasaAsistencia}%` : null}
          detalle="completados vs. cancelados"
        />
        <KpiTile
          icono={UserX}
          titulo="En riesgo"
          valor={d ? String(d.pacientesEnRiesgo) : null}
          detalle={
            d ? `sin actividad +${d.diasAbandono} d` : "inactividad reciente"
          }
          alerta={Boolean(d && d.pacientesEnRiesgo > 0)}
        />
      </div>

      {/* Resumen del análisis IA (solo con el ml-servicio activo) */}
      {insightsActivo && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile
            icono={AlertTriangle}
            titulo="Riesgo de abandono"
            valor={String(porTipo("RIESGO_ABANDONO"))}
            detalle="detectados por el modelo"
            alerta={porTipo("RIESGO_ABANDONO") > 0}
          />
          <KpiTile
            icono={Activity}
            titulo="Adherencia baja"
            valor={String(porTipo("ADHERENCIA"))}
            detalle="con plan activo"
          />
          <KpiTile
            icono={TrendingUp}
            titulo="Estancamiento"
            valor={String(porTipo("TENDENCIA_PESO"))}
            detalle="peso estable sostenido"
          />
          <KpiTile
            icono={ShieldAlert}
            titulo="Alertas críticas"
            valor={String(criticas)}
            detalle="requieren acción"
            alerta={criticas > 0}
          />
        </div>
      )}
    </div>
  );
}

function KpiTile({
  icono: Icono,
  titulo,
  valor,
  detalle,
  alerta = false,
}: {
  icono: typeof Users;
  titulo: string;
  valor: string | null;
  detalle: string;
  alerta?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {titulo}
        </CardTitle>
        <Icono
          className={cn(
            "h-4 w-4",
            alerta ? "text-destructive" : "text-muted-foreground",
          )}
        />
      </CardHeader>
      <CardContent>
        {valor == null ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <p
            className={cn(
              "text-2xl font-bold tabular-nums",
              alerta && "text-destructive",
            )}
          >
            {valor}
          </p>
        )}
        <p className="mt-0.5 text-[11px] text-muted-foreground">{detalle}</p>
      </CardContent>
    </Card>
  );
}
