"use client";

import Link from "next/link";
import { Bell, Check, RefreshCw, X } from "lucide-react";
import { useSeguimiento } from "@/lib/hooks/useSeguimiento";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";

const MAXIMO_VISIBLE = 6;

/**
 * Panel de alertas de seguimiento pendientes para el dashboard.
 *
 * Es el ÚNICO lugar donde se muestran: salieron de la campana porque son un
 * estado del paciente que se trabaja con tiempo, no un aviso de algo que
 * acaba de pasar. Por eso el «Revisar ahora», que vivía en la campana, está
 * acá.
 */
export function PanelAlertas() {
  const { alertasPendientes, resolverAlerta, generarAlertas } =
    useSeguimiento();
  const consulta = alertasPendientes();
  const alertas = consulta.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Alertas de seguimiento
          {alertas.length > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
              {alertas.length}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 gap-1 text-xs font-normal text-muted-foreground"
            disabled={generarAlertas.isPending}
            onClick={() => generarAlertas.mutate()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Revisar ahora
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {consulta.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : alertas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin pendientes: todos los pacientes al día.
          </p>
        ) : (
          <ul className="divide-y">
            {alertas.slice(0, MAXIMO_VISIBLE).map((alerta) => (
              <li
                key={alerta.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="leading-snug">{alerta.detalle}</p>
                  {alerta.pacienteNombre && (
                    <Link
                      href={`/dashboard/pacientes/${alerta.pacienteId}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Ver ficha de {alerta.pacienteNombre}
                    </Link>
                  )}
                </div>
                <span className="flex shrink-0 gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Marcar como resuelta"
                    disabled={resolverAlerta.isPending}
                    onClick={() =>
                      resolverAlerta.mutate({
                        id: alerta.id,
                        estado: "RESUELTA",
                      })
                    }
                  >
                    <Check className="h-4 w-4 text-primary" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Descartar"
                    disabled={resolverAlerta.isPending}
                    onClick={() =>
                      resolverAlerta.mutate({
                        id: alerta.id,
                        estado: "DESCARTADA",
                      })
                    }
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {alertas.length > MAXIMO_VISIBLE && (
          <p className="mt-2 text-xs text-muted-foreground">
            Y {alertas.length - MAXIMO_VISIBLE} más en la campana de arriba.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
