"use client";

import Link from "next/link";
import {
  ChevronRight,
  Wallet,
  CalendarCheck,
  UserPlus,
  TrendingUp,
} from "lucide-react";
import { useEstadisticas } from "@/lib/hooks/useEstadisticas";
import { formatearMoneda } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { ACENTOS, type ClaveAcento } from "./acentos";

/**
 * Los tres números del mes en curso: cobrado, asistencia y pacientes nuevos.
 *
 * Es un resumen, no una copia de Estadísticas: reusa la MISMA consulta
 * (`estadisticas.obtener`) acotada al mes, y para cualquier corte distinto
 * manda a esa pantalla. Duplicar el cálculo acá haría que dos pantallas
 * dieran cifras distintas del mismo mes.
 *
 * El rango se calcula sobre el `hoy` que ya tiene anclado el dashboard: si
 * leyera el reloj por su cuenta, al cruzar la medianoche pediría un mes
 * distinto del que muestra el resto de la página.
 */
export function ResumenDelMes({ hoy }: { hoy: string }) {
  const { obtener } = useEstadisticas();
  const hasta = new Date(hoy);
  const desde = new Date(
    Date.UTC(hasta.getUTCFullYear(), hasta.getUTCMonth(), 1),
  );

  const consulta = obtener({ desde, hasta });
  const datos = consulta.data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Resumen del mes
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/estadisticas">
            Ver estadísticas
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {consulta.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : consulta.isError || !datos ? (
          <p className="text-sm text-destructive">
            No se pudieron cargar las cifras del mes.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Dato
              icono={Wallet}
              acento="verde"
              etiqueta="Cobrado"
              valor={formatearMoneda(datos.ingresos.cobrado)}
              // Lo pendiente se dice al lado y no se suma: cobrado y por
              // cobrar son dos cosas, y mezclarlas infla el mes.
              detalle={
                datos.ingresos.pendiente > 0
                  ? `${formatearMoneda(datos.ingresos.pendiente)} por cobrar`
                  : "sin pendientes"
              }
            />
            <Dato
              icono={CalendarCheck}
              acento="azul"
              etiqueta="Asistencia"
              valor={`${Math.round(datos.tasaAsistencia)} %`}
              detalle={`${datos.turnos.completados} de ${datos.turnos.total} turnos`}
            />
            <Dato
              icono={UserPlus}
              acento="violeta"
              etiqueta="Pacientes nuevos"
              valor={String(datos.pacientesNuevos)}
              detalle={`${datos.pacientesActivos} activos en el período`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Dato({
  icono: Icono,
  acento,
  etiqueta,
  valor,
  detalle,
}: {
  icono: typeof Wallet;
  acento: ClaveAcento;
  etiqueta: string;
  valor: string;
  detalle: string;
}) {
  const color = ACENTOS[acento];
  return (
    <div className="flex items-start gap-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color.chip}`}
      >
        <Icono className={`h-4 w-4 ${color.tinta}`} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{etiqueta}</p>
        <p className="text-2xl font-bold tracking-tight">{valor}</p>
        <p className="text-xs text-muted-foreground">{detalle}</p>
      </div>
    </div>
  );
}
