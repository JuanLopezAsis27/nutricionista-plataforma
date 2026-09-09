"use client";

import { useState } from "react";
import {
  Scale,
  GlassWater,
  Moon,
  UtensilsCrossed,
  Dumbbell,
} from "lucide-react";
import { useDiario } from "@/lib/hooks/useDiario";
import { formatearFechaLarga, formatearNumero } from "@/lib/formato";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { ControlesPaginacion } from "@/componentes/comunes/ControlesPaginacion";
import { FotoConVisor } from "@/componentes/comunes/FotoConVisor";

/** Días con carga por página (no días de calendario: ver `obtenerPaginado`). */
const POR_PAGINA = 10;

/**
 * Vista de solo lectura del diario para el nutricionista (ficha del
 * paciente): paginada por días CON CARGA, la más reciente primero.
 */
export function DiarioPacienteVista({ pacienteId }: { pacienteId: string }) {
  const { obtenerPaginado } = useDiario();
  const [pagina, setPagina] = useState(1);

  const registros = obtenerPaginado({
    pacienteId,
    pagina,
    porPagina: POR_PAGINA,
  });

  if (registros.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const dias = registros.data?.items ?? [];
  const totalPaginas = registros.data?.paginas ?? 1;

  if (dias.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        El paciente todavía no registró nada en su diario.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Días registrados por el paciente (solo lectura), del más reciente al más
        viejo.
      </p>
      {dias.map((dia) => (
        <Card key={dia.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm capitalize">
              {formatearFechaLarga(dia.fecha)}
              <span className="flex flex-wrap gap-3 text-xs font-normal normal-case text-muted-foreground">
                {dia.pesoKg != null && (
                  <span className="inline-flex items-center gap-1">
                    <Scale className="h-3.5 w-3.5" />{" "}
                    {formatearNumero(dia.pesoKg)} kg
                  </span>
                )}
                {dia.aguaMl != null && (
                  <span className="inline-flex items-center gap-1">
                    <GlassWater className="h-3.5 w-3.5" /> {dia.aguaMl} ml
                  </span>
                )}
                {dia.horasSueno != null && (
                  <span className="inline-flex items-center gap-1">
                    <Moon className="h-3.5 w-3.5" />{" "}
                    {formatearNumero(dia.horasSueno)} h
                    {dia.calidadSueno
                      ? ` (${dia.calidadSueno.toLowerCase()})`
                      : ""}
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
                <ul className="space-y-1.5">
                  {dia.comidas.map((comida) => (
                    <li key={comida.id} className="flex items-center gap-2">
                      {comida.fotoArchivoId && (
                        <FotoConVisor
                          archivoId={comida.fotoArchivoId}
                          alt={`Foto de ${comida.franja.toLowerCase()}`}
                          className="h-10 w-10 shrink-0"
                        />
                      )}
                      <span>
                        <span className="text-muted-foreground">
                          {comida.franja}
                          {comida.hora ? ` ${comida.hora}` : ""}:
                        </span>{" "}
                        {comida.descripcion}
                      </span>
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
              <p className="text-xs text-muted-foreground">
                Notas: {dia.notas}
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      <ControlesPaginacion
        pagina={pagina}
        totalPaginas={totalPaginas}
        onCambiar={setPagina}
      />
    </div>
  );
}
