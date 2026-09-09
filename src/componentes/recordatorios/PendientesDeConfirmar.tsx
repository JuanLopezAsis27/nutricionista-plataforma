"use client";

import { ExternalLink, Check, X, Clock } from "lucide-react";
import type { RecordatorioPendienteSalidaDto } from "@/aplicacion/dtos/recordatorios.dto";
import { useRecordatorios } from "@/lib/hooks/useRecordatorios";
import { formatearFecha } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";

/**
 * Los recordatorios abiertos en WhatsApp que nadie confirmó todavía.
 *
 * Es la contracara del enlace `wa.me`: la app arma el mensaje y abre el chat,
 * pero WhatsApp no le devuelve nada, así que el envío lo declara el
 * profesional. Antes esa confirmación vivía en un botón de la grilla de turnos
 * y se perdía apenas se cerraba el diálogo; acá queda hasta que se resuelve.
 *
 * Con la Cloud API conectada esta bandeja está vacía: ahí lo confirma el
 * webhook de entrega y no hay nada que declarar.
 */
export function PendientesDeConfirmar() {
  const { pendientes, confirmarEnvio } = useRecordatorios();
  const consulta = pendientes();
  const filas = consulta.data ?? [];

  if (consulta.isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }
  if (filas.length === 0) return null;

  return (
    <Card className="border-amber-500/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5 text-amber-600" />
          Sin confirmar ({filas.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Estos chats se abrieron con el mensaje cargado, pero WhatsApp no le
          avisa a la app si el mensaje salió. Marcá cuáles mandaste: mientras
          queden acá, el paciente cuenta como «no avisado» y un envío nuevo va a
          reusar este mismo aviso en vez de duplicarlo.
        </p>

        <ul className="divide-y rounded-md border">
          {filas.map((fila) => (
            <FilaPendiente
              key={fila.recordatorioId}
              fila={fila}
              cargando={confirmarEnvio.isPending}
              onResolver={(enviado) =>
                confirmarEnvio.mutate({
                  recordatorioId: fila.recordatorioId,
                  enviado,
                })
              }
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function FilaPendiente({
  fila,
  cargando,
  onResolver,
}: {
  fila: RecordatorioPendienteSalidaDto;
  cargando: boolean;
  onResolver: (enviado: boolean) => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{fila.nombrePaciente}</p>
        <p className="text-xs text-muted-foreground">
          Turno del {formatearFecha(fila.fechaTurno)}
          {fila.horaTurno ? ` · ${fila.horaTurno}` : ""} · abierto el{" "}
          {formatearFecha(fila.abiertoEn)}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" asChild>
          <a href={fila.enlace} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" /> Abrir chat
          </a>
        </Button>
        <Button size="sm" disabled={cargando} onClick={() => onResolver(true)}>
          <Check className="h-4 w-4" /> Ya lo mandé
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={cargando}
          title="Finalmente no lo mandé"
          onClick={() => onResolver(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
