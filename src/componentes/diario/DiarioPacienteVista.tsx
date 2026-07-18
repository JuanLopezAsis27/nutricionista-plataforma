"use client";

import {
  Scale,
  GlassWater,
  Moon,
  UtensilsCrossed,
  Dumbbell,
  ExternalLink,
} from "lucide-react";
import { useDiario } from "@/lib/hooks/useDiario";
import { formatearFechaLarga, formatearNumero, hoyLocalISO } from "@/lib/formato";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";

const DIAS_VISTA = 14;

/**
 * Vista de solo lectura del diario para el nutricionista (ficha del
 * paciente): los últimos 14 días con todo lo que el paciente registró.
 */
export function DiarioPacienteVista({ pacienteId }: { pacienteId: string }) {
  const { obtenerRango } = useDiario();

  // Fechas ancladas al día (no `new Date()` por render: cambiaría la clave
  // de la query en cada render y la consulta quedaría cargando para siempre).
  const hasta = new Date(hoyLocalISO());
  const desde = new Date(hasta.getTime() - (DIAS_VISTA - 1) * 24 * 60 * 60 * 1000);
  const registros = obtenerRango({ pacienteId, desde, hasta });

  if (registros.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const dias = [...(registros.data ?? [])].reverse(); // más reciente primero

  if (dias.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        El paciente todavía no registró nada en su diario en los últimos{" "}
        {DIAS_VISTA} días.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Últimos {DIAS_VISTA} días registrados por el paciente (solo lectura).
      </p>
      {dias.map((dia) => (
        <Card key={dia.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm capitalize">
              {formatearFechaLarga(dia.fecha)}
              <span className="flex flex-wrap gap-3 text-xs font-normal normal-case text-muted-foreground">
                {dia.pesoKg != null && (
                  <span className="inline-flex items-center gap-1">
                    <Scale className="h-3.5 w-3.5" /> {formatearNumero(dia.pesoKg)} kg
                  </span>
                )}
                {dia.aguaMl != null && (
                  <span className="inline-flex items-center gap-1">
                    <GlassWater className="h-3.5 w-3.5" /> {dia.aguaMl} ml
                  </span>
                )}
                {dia.horasSueno != null && (
                  <span className="inline-flex items-center gap-1">
                    <Moon className="h-3.5 w-3.5" /> {formatearNumero(dia.horasSueno)} h
                    {dia.calidadSueno ? ` (${dia.calidadSueno.toLowerCase()})` : ""}
                  </span>
                )}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dia.comidas.length > 0 && (
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <UtensilsCrossed className="h-3.5 w-3.5" /> Comidas
                </p>
                <ul className="space-y-1">
                  {dia.comidas.map((comida) => (
                    <li key={comida.id} className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {comida.franja}
                        {comida.hora ? ` ${comida.hora}` : ""}:
                      </span>
                      {comida.descripcion}
                      {comida.fotoArchivoId && (
                        <a
                          href={`/api/archivos/${comida.fotoArchivoId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                        >
                          foto <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {dia.actividades.length > 0 && (
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <Dumbbell className="h-3.5 w-3.5" /> Actividad
                </p>
                <ul className="space-y-1">
                  {dia.actividades.map((actividad) => (
                    <li key={actividad.id}>
                      {actividad.tipo} · {actividad.duracionMinutos} min
                      {actividad.intensidad
                        ? ` · ${actividad.intensidad.toLowerCase()}`
                        : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {dia.notas && (
              <p className="text-xs text-muted-foreground">Notas: {dia.notas}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
