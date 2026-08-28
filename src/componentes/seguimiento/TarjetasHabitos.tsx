"use client";

import { GlassWater, Moon, Dumbbell, UtensilsCrossed } from "lucide-react";
import { useSeguimiento } from "@/lib/hooks/useSeguimiento";
import { formatearNumero } from "@/lib/formato";
import { Card, CardContent } from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";

/**
 * Resumen de hábitos del período (agua, sueño, actividad y comidas).
 *
 * Vivía en la pestaña «Informes», que mostraba lo mismo que «Progreso» con
 * otro formato. Ahora es un bloque de Progreso: los promedios de arriba y la
 * adherencia día a día debajo son dos lecturas del mismo diario, no dos
 * secciones distintas.
 *
 * Solo para el nutricionista: `informeHabitos` es un procedimiento suyo.
 */
export function TarjetasHabitos({
  pacienteId,
  desde,
  hasta,
}: {
  pacienteId: string;
  desde: Date;
  hasta: Date;
}) {
  const { informeHabitos } = useSeguimiento();
  const habitos = informeHabitos({ pacienteId, desde, hasta });

  if (habitos.isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }
  if (!habitos.data) return null;

  const datos = habitos.data;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <TarjetaHabito
        icono={GlassWater}
        titulo="Agua promedio"
        valor={
          datos.aguaPromedioMl != null
            ? `${formatearNumero(datos.aguaPromedioMl)} ml`
            : "—"
        }
        detalle={`${datos.diasConRegistro} de ${datos.diasEnRango} días con registro`}
      />
      <TarjetaHabito
        icono={Moon}
        titulo="Sueño promedio"
        valor={
          datos.horasSuenoPromedio != null
            ? `${formatearNumero(datos.horasSuenoPromedio)} h`
            : "—"
        }
        detalle={`Calidad: ${datos.calidadSueno.BUENA} buena · ${datos.calidadSueno.REGULAR} regular · ${datos.calidadSueno.MALA} mala`}
      />
      <TarjetaHabito
        icono={Dumbbell}
        titulo="Actividad física"
        valor={`${datos.diasConActividad} día(s)`}
        detalle={`${datos.minutosActividadTotal} min en total`}
      />
      <TarjetaHabito
        icono={UtensilsCrossed}
        titulo="Comidas registradas"
        valor={`${datos.comidasRegistradas}`}
        detalle="en el diario del período"
      />
    </div>
  );
}

function TarjetaHabito({
  icono: Icono,
  titulo,
  valor,
  detalle,
}: {
  icono: typeof GlassWater;
  titulo: string;
  valor: string;
  detalle: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icono className="h-3.5 w-3.5" /> {titulo}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{valor}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p>
      </CardContent>
    </Card>
  );
}
