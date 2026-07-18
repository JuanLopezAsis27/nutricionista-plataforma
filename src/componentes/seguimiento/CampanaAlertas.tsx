"use client";

import { Bell, Check, X, RefreshCw } from "lucide-react";
import { useSeguimiento } from "@/lib/hooks/useSeguimiento";
import { Button } from "@/componentes/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/componentes/ui/dropdown-menu";

const REFRESCO_MS = 60_000;

/**
 * Campana de la barra superior: contador de alertas de seguimiento
 * pendientes y listado con acciones rápidas (resolver / descartar).
 */
export function CampanaAlertas() {
  const { contarAlertas, alertasPendientes, resolverAlerta, generarAlertas } =
    useSeguimiento();

  const contador = contarAlertas(undefined, { refetchInterval: REFRESCO_MS });
  const alertas = alertasPendientes(undefined, { refetchInterval: REFRESCO_MS });
  const cantidad = contador.data ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Alertas de seguimiento (${cantidad} pendientes)`} className="relative">
          <Bell className="h-5 w-5" />
          {cantidad > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {cantidad > 9 ? "9+" : cantidad}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-w-[90vw]">
        <DropdownMenuLabel className="flex items-center justify-between">
          Alertas de seguimiento
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground"
            disabled={generarAlertas.isPending}
            onClick={() => generarAlertas.mutate()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Revisar ahora
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(alertas.data ?? []).length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
            No hay alertas pendientes. 🎉
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {alertas.data!.map((alerta) => (
              <li
                key={alerta.id}
                className="flex items-start justify-between gap-2 px-3 py-2 text-sm hover:bg-secondary/50"
              >
                <p className="min-w-0 flex-1 leading-snug">{alerta.detalle}</p>
                <span className="flex shrink-0 gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Marcar como resuelta"
                    disabled={resolverAlerta.isPending}
                    onClick={() =>
                      resolverAlerta.mutate({ id: alerta.id, estado: "RESUELTA" })
                    }
                  >
                    <Check className="h-4 w-4 text-primary" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Descartar"
                    disabled={resolverAlerta.isPending}
                    onClick={() =>
                      resolverAlerta.mutate({ id: alerta.id, estado: "DESCARTADA" })
                    }
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
