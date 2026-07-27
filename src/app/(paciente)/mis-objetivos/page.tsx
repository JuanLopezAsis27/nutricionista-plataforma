"use client";

import { Target, CheckCircle2, CircleDashed } from "lucide-react";
import type { ObjetivoSalidaDto } from "@/aplicacion/dtos/objetivo.dto";
import { useObjetivos } from "@/lib/hooks/useObjetivos";
import { formatearFecha } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";

const ETIQUETA_PRIORIDAD = { ALTA: "Alta", MEDIA: "Media", BAJA: "Baja" } as const;
const ETIQUETA_ESTADO = {
  EN_CURSO: "En curso",
  CUMPLIDO: "Cumplido",
  ABANDONADO: "Abandonado",
} as const;
const ORDEN_PRIORIDAD = { ALTA: 0, MEDIA: 1, BAJA: 2 } as const;

/** Portal del paciente: sus objetivos y estrategias, en modo lectura. */
export default function PaginaMisObjetivos() {
  const { mios } = useObjetivos();
  const consulta = mios();
  const objetivos = consulta.data ?? [];

  const enCurso = objetivos
    .filter((o) => o.estado === "EN_CURSO")
    .sort((a, b) => ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad]);
  const cerrados = objetivos.filter((o) => o.estado !== "EN_CURSO");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Target className="h-6 w-6 text-primary" /> Mis objetivos
        </h1>
        <p className="text-sm text-muted-foreground">
          Las metas que definiste con tu nutricionista y cómo vas a alcanzarlas.
        </p>
      </div>

      {consulta.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : objetivos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay objetivos cargados. Tu nutricionista los va a definir con vos.
        </p>
      ) : (
        <>
          <div className="space-y-4">
            {enCurso.map((objetivo) => (
              <TarjetaObjetivo key={objetivo.id} objetivo={objetivo} />
            ))}
          </div>

          {cerrados.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Cerrados</h2>
              {cerrados.map((objetivo) => (
                <TarjetaObjetivo key={objetivo.id} objetivo={objetivo} atenuado />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TarjetaObjetivo({
  objetivo,
  atenuado = false,
}: {
  objetivo: ObjetivoSalidaDto;
  atenuado?: boolean;
}) {
  const estrategiasActivas = objetivo.estrategias.filter((e) => e.estado !== "DESCARTADA");
  return (
    <Card className={cn(atenuado && "opacity-70")}>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {objetivo.titulo}
          <Badge
            variant={objetivo.prioridad === "ALTA" ? "default" : "secondary"}
            className="text-[10px]"
          >
            Prioridad {ETIQUETA_PRIORIDAD[objetivo.prioridad]}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {ETIQUETA_ESTADO[objetivo.estado]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {objetivo.descripcion && (
          <p className="text-muted-foreground">{objetivo.descripcion}</p>
        )}
        {objetivo.fechaObjetivo && (
          <p className="text-xs text-muted-foreground">
            Meta para el {formatearFecha(objetivo.fechaObjetivo)}
          </p>
        )}
        {estrategiasActivas.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Estrategias:</p>
            <ul className="space-y-1">
              {estrategiasActivas.map((estrategia) => (
                <li key={estrategia.id} className="flex items-start gap-2">
                  {estrategia.estado === "LOGRADA" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={cn(estrategia.estado === "LOGRADA" && "text-muted-foreground")}>
                    {estrategia.descripcion}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
