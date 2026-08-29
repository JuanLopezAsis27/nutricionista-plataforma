"use client";

import Link from "next/link";
import { MessageSquare, CheckCheck, Clock, CircleAlert } from "lucide-react";
import type { SeguimientoRecordatorioSalidaDto } from "@/aplicacion/dtos/recordatorios.dto";
import { useRecordatorios } from "@/lib/hooks/useRecordatorios";
import { formatearFecha } from "@/lib/formato";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Button } from "@/componentes/ui/button";

/**
 * Quién recibió el recordatorio y quién contestó.
 *
 * El log de envíos por sí solo dice "salió"; lo que hay que poder mirar antes
 * de liberar un horario es si el paciente respondió. Cada fila abre el chat de
 * WhatsApp de ese paciente en Mensajes, que es donde vive la conversación.
 */
export function BandejaSeguimiento() {
  const { seguimiento } = useRecordatorios();
  const consulta = seguimiento({ limite: 50 });
  const filas = consulta.data ?? [];

  if (consulta.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (filas.length === 0) {
    return (
      <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
        Todavía no se envió ningún recordatorio por WhatsApp.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {filas.map((fila) => (
        <FilaSeguimiento key={fila.recordatorioId} fila={fila} />
      ))}
    </ul>
  );
}

function FilaSeguimiento({ fila }: { fila: SeguimientoRecordatorioSalidaDto }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 p-3">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {fila.nombrePaciente}
          <EstadoRecordatorio fila={fila} />
        </p>
        <p className="text-xs text-muted-foreground">
          Turno del {formatearFecha(fila.fechaTurno)}
          {fila.horaTurno ? ` · ${fila.horaTurno}` : ""} · aviso{" "}
          {fila.diasAntes != null ? `${fila.diasAntes} días antes` : "manual"}{" "}
          del {formatearFecha(fila.enviadoEn)}
        </p>
        {fila.ultimoMensaje && (
          <p className="mt-1 truncate text-sm text-muted-foreground">
            «{fila.ultimoMensaje}»
          </p>
        )}
      </div>

      <Button variant="outline" size="sm" asChild>
        <Link
          href={`/dashboard/mensajes?paciente=${fila.pacienteId}&canal=whatsapp`}
        >
          <MessageSquare className="h-4 w-4" /> Ver chat
        </Link>
      </Button>
    </li>
  );
}

/**
 * El estado en una sola pastilla, priorizando la información que decide algo:
 * que el paciente haya confirmado importa más que el tilde de entrega.
 */
function EstadoRecordatorio({
  fila,
}: {
  fila: SeguimientoRecordatorioSalidaDto;
}) {
  if (fila.confirmo) {
    return (
      <Badge>
        <CheckCheck className="mr-1 h-3 w-3" /> Confirmó
      </Badge>
    );
  }
  if (fila.respondio) {
    return (
      <Badge variant="secondary">
        <MessageSquare className="mr-1 h-3 w-3" /> Respondió
      </Badge>
    );
  }
  if (fila.estado === "FALLIDO") {
    return (
      <Badge variant="destructive">
        <CircleAlert className="mr-1 h-3 w-3" /> No se pudo enviar
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <Clock className="mr-1 h-3 w-3" /> {etiquetaEntrega(fila.estado)}
    </Badge>
  );
}

function etiquetaEntrega(
  estado: SeguimientoRecordatorioSalidaDto["estado"],
): string {
  switch (estado) {
    case "PREPARADO":
      return "Sin confirmar el envío";
    case "ENVIADO":
      return "Enviado";
    case "ENTREGADO":
      return "Entregado";
    case "LEIDO":
      return "Leído, sin respuesta";
    default:
      return estado.toLowerCase();
  }
}
