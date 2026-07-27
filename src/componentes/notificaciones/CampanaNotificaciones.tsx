"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Check, X, RefreshCw, AlertTriangle, MessageSquare, Mail } from "lucide-react";
import type { NotificacionDto } from "@/aplicacion/dtos/notificaciones.dto";
import { useNotificaciones } from "@/lib/hooks/useNotificaciones";
import { useSeguimiento } from "@/lib/hooks/useSeguimiento";
import { useMensajeria } from "@/lib/hooks/useMensajeria";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/componentes/ui/dropdown-menu";

const ICONO: Record<NotificacionDto["tipo"], typeof Bell> = {
  ALERTA: AlertTriangle,
  MENSAJE: MessageSquare,
  CORREO: Mail,
};

const fmtFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Campana de la barra superior: centro de notificaciones del nutricionista.
 * Reúne en un solo feed las alertas de seguimiento (accionables), los mensajes
 * de pacientes sin leer y los avisos de correo. Se actualiza en tiempo real
 * (useTiempoReal invalida `notificaciones.centro`); no hace polling.
 */
export function CampanaNotificaciones() {
  const [abierto, setAbierto] = useState(false);
  const utils = trpc.useUtils();
  const { centro } = useNotificaciones();
  const { resolverAlerta, generarAlertas } = useSeguimiento();
  const { marcarLeidosDe } = useMensajeria();

  const consulta = centro();
  const items = consulta.data?.items ?? [];
  const total = consulta.data?.total ?? 0;

  const refrescar = () => void utils.notificaciones.centro.invalidate();

  function resolver(alertaId: string, estado: "RESUELTA" | "DESCARTADA") {
    resolverAlerta.mutate({ id: alertaId, estado }, { onSuccess: refrescar });
  }

  /** Al abrir una notificación de mensaje, se marca leída (deja de figurar). */
  function abrirNotificacion(n: NotificacionDto) {
    if (n.tipo === "MENSAJE" && n.pacienteId) {
      marcarLeidosDe.mutate({ pacienteId: n.pacienteId }, { onSuccess: refrescar });
    }
    setAbierto(false);
  }

  return (
    <DropdownMenu open={abierto} onOpenChange={setAbierto}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notificaciones (${total} pendientes)`}
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {total > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {total > 9 ? "9+" : total}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-w-[90vw]">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notificaciones
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground"
            disabled={generarAlertas.isPending}
            onClick={() => generarAlertas.mutate(undefined, { onSuccess: refrescar })}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Revisar ahora
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
            No hay notificaciones pendientes. 🎉
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {items.map((n) => (
              <FilaNotificacion
                key={n.id}
                notificacion={n}
                resolviendo={resolverAlerta.isPending}
                onResolver={resolver}
                onNavegar={() => abrirNotificacion(n)}
              />
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilaNotificacion({
  notificacion: n,
  resolviendo,
  onResolver,
  onNavegar,
}: {
  notificacion: NotificacionDto;
  resolviendo: boolean;
  onResolver: (alertaId: string, estado: "RESUELTA" | "DESCARTADA") => void;
  onNavegar: () => void;
}) {
  const Icono = ICONO[n.tipo];

  const cuerpo = (
    <>
      <Icono
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          n.tipo === "CORREO" ? "text-muted-foreground" : "text-primary",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-medium leading-snug">
          <span className="truncate">{n.titulo}</span>
          {n.noLeidos != null && n.noLeidos > 0 && (
            <span className="shrink-0 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {n.noLeidos}
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">{n.detalle}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{fmtFecha.format(n.fecha)}</p>
      </div>
    </>
  );

  // Las alertas se resuelven/descartan en el lugar; el resto navega a su sección.
  if (n.tipo === "ALERTA" && n.alertaId) {
    const alertaId = n.alertaId;
    return (
      <li className="flex items-start gap-2 px-3 py-2 text-sm hover:bg-secondary/50">
        {cuerpo}
        <span className="flex shrink-0 gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Marcar como resuelta"
            disabled={resolviendo}
            onClick={() => onResolver(alertaId, "RESUELTA")}
          >
            <Check className="h-4 w-4 text-primary" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Descartar"
            disabled={resolviendo}
            onClick={() => onResolver(alertaId, "DESCARTADA")}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </span>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={n.enlace ?? "#"}
        onClick={onNavegar}
        className="flex items-start gap-2 px-3 py-2 text-sm hover:bg-secondary/50"
      >
        {cuerpo}
      </Link>
    </li>
  );
}
