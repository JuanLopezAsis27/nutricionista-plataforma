"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  MessageCircle,
  CalendarCheck,
  Mail,
} from "lucide-react";
import type { NotificacionDto } from "@/aplicacion/dtos/notificaciones.dto";
import { useNotificaciones } from "@/lib/hooks/useNotificaciones";
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
  MENSAJE: MessageSquare,
  CORREO: Mail,
  WHATSAPP: MessageCircle,
  TURNO: CalendarCheck,
};

const fmtFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Campana de la barra superior: centro de notificaciones del nutricionista.
 * Reúne en un solo feed los avisos de lo que acaba de pasar —mensajes,
 * WhatsApp, turnos, correos que fallaron—. Las alertas de seguimiento NO van
 * acá: son un estado del paciente que se trabaja con tiempo, en el panel del
 * dashboard. Se actualiza en tiempo real (useTiempoReal invalida
 * `notificaciones.centro`); no hace polling.
 */
export function CampanaNotificaciones() {
  const [abierto, setAbierto] = useState(false);
  const { centro, marcarVista } = useNotificaciones();

  const consulta = centro();
  const items = consulta.data?.items ?? [];
  const total = consulta.data?.total ?? 0;

  /** Hay algo persistido sin ver: habilita el "marcar todas". */
  const haySinVer = items.some((n) => n.vista === false);

  /**
   * Abrir una notificación es también atenderla: se marca vista. Los mensajes
   * se marcan leídos al abrirse la conversación —que también apaga su aviso,
   * se llegue por donde se llegue—, así que acá no se repite.
   */
  function abrirNotificacion(n: NotificacionDto) {
    if (n.notificacionId && n.vista === false) {
      marcarVista.mutate({ id: n.notificacionId });
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
        <DropdownMenuLabel className="flex items-center justify-between gap-1">
          Notificaciones
          <span className="flex items-center gap-0.5">
            {haySinVer && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-muted-foreground"
                disabled={marcarVista.isPending}
                title="Marcar todas como vistas"
                onClick={() => marcarVista.mutate({})}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar vistas
              </Button>
            )}
          </span>
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
                onNavegar={() => abrirNotificacion(n)}
                onMarcarVista={
                  n.notificacionId && n.vista === false
                    ? () => marcarVista.mutate({ id: n.notificacionId! })
                    : undefined
                }
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
  onNavegar,
  onMarcarVista,
}: {
  notificacion: NotificacionDto;
  onNavegar: () => void;
  /** Solo en las persistidas que todavía no se vieron. */
  onMarcarVista?: () => void;
}) {
  const Icono = ICONO[n.tipo];
  // Ya vista: se sigue mostrando (la campana es también el registro de lo que
  // pasó) pero apagada, para que lo pendiente se distinga de un vistazo.
  const apagada = n.vista === true;

  const cuerpo = (
    <>
      <Icono
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          n.tipo === "CORREO" || apagada
            ? "text-muted-foreground"
            : "text-primary",
        )}
      />
      <div className={cn("min-w-0 flex-1", apagada && "opacity-60")}>
        <p className="flex items-center gap-1.5 font-medium leading-snug">
          <span className="truncate">{n.titulo}</span>
          {n.noLeidos != null && n.noLeidos > 0 && (
            <span className="shrink-0 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {n.noLeidos}
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">{n.detalle}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {fmtFecha.format(n.fecha)}
        </p>
      </div>
    </>
  );

  // Las persistidas sin ver llevan su propio botón de "visto", para poder
  // atenderlas sin tener que navegar a la pantalla que enlazan.
  if (onMarcarVista) {
    return (
      <li className="flex items-start gap-2 pr-1 text-sm hover:bg-secondary/50">
        <Link
          href={n.enlace ?? "#"}
          onClick={onNavegar}
          className="flex min-w-0 flex-1 items-start gap-2 px-3 py-2"
        >
          {cuerpo}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="mt-1 h-7 w-7 shrink-0"
          title="Marcar como vista"
          onClick={onMarcarVista}
        >
          <Check className="h-4 w-4 text-primary" />
        </Button>
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
