"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, ArrowRight } from "lucide-react";
import { useConfiguracion } from "@/lib/hooks/useConfiguracion";
import { PREFIJO_PAIS_POR_DEFECTO } from "@/dominio/servicios/telefono";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";

/**
 * Cómo se resuelven los teléfonos de los pacientes para WhatsApp.
 *
 * El TEXTO del recordatorio ya no se edita acá: son plantillas propias, que
 * viven en Recordatorios porque una de ellas tiene que corresponderse con la
 * que Meta aprobó. Tener el mismo texto en dos pantallas era garantizar que un
 * día discreparan y que el que sale fuera el que nadie estaba mirando.
 */
export function FormularioWhatsapp() {
  const { obtener, guardar } = useConfiguracion();
  const consulta = obtener();
  const config = consulta.data;

  const [prefijo, setPrefijo] = useState(PREFIJO_PAIS_POR_DEFECTO);

  useEffect(() => {
    if (!config) return;
    setPrefijo(config.whatsappPrefijoPais ?? PREFIJO_PAIS_POR_DEFECTO);
  }, [config]);

  if (consulta.isLoading || !config) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-5 w-5 text-primary" /> Teléfonos para
          WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="prefijo-wa">Prefijo de país</Label>
          <Input
            id="prefijo-wa"
            className="w-32"
            inputMode="numeric"
            placeholder={PREFIJO_PAIS_POR_DEFECTO}
            value={prefijo}
            onChange={(e) => setPrefijo(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Sin el «+». Se usa para completar los teléfonos cargados en formato
            local (Argentina es 54). En los celulares argentinos hace falta el 9
            después del 54 y no va el 15: la app lo agrega sola.
          </p>
        </div>

        <div className="space-y-1.5 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          <p>
            El texto del recordatorio, cuándo sale y por qué medios se
            configuran en{" "}
            <Link
              href="/dashboard/recordatorios"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              Recordatorios <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            .
          </p>
          <p>
            Conectar la API oficial —para que los mensajes salgan solos desde el
            número del consultorio— se hace en{" "}
            <Link
              href="/dashboard/integraciones"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              Integraciones <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            .
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={guardar.isPending}
            onClick={() =>
              guardar.mutate({ whatsappPrefijoPais: prefijo.trim() || null })
            }
          >
            Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
