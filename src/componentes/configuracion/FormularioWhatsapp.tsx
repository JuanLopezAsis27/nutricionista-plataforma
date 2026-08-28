"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useConfiguracion } from "@/lib/hooks/useConfiguracion";
import { PLACEHOLDERS_PLANTILLA } from "@/dominio/entidades/PlantillaEmail";
import {
  PLANTILLA_WHATSAPP_POR_DEFECTO,
  MAX_LARGO_PLANTILLA_WHATSAPP,
  renderizarPlantilla,
} from "@/dominio/casos-de-uso/whatsapp/plantilla";
import { PREFIJO_PAIS_POR_DEFECTO } from "@/dominio/servicios/telefono";
import { variablesEjemplo } from "@/dominio/casos-de-uso/secretaria/variables";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";

/** Editor del mensaje de recordatorio de turno que se abre en WhatsApp. */
export function FormularioWhatsapp() {
  const { obtener, guardar } = useConfiguracion();
  const consulta = obtener();
  const config = consulta.data;

  const [plantilla, setPlantilla] = useState("");
  const [prefijo, setPrefijo] = useState(PREFIJO_PAIS_POR_DEFECTO);

  useEffect(() => {
    if (!config) return;
    setPlantilla(config.whatsappPlantilla ?? PLANTILLA_WHATSAPP_POR_DEFECTO);
    setPrefijo(config.whatsappPrefijoPais ?? PREFIJO_PAIS_POR_DEFECTO);
  }, [config]);

  const vistaPrevia = useMemo(
    () =>
      renderizarPlantilla(
        plantilla,
        variablesEjemplo(config?.nombreProfesional ?? "tu nutricionista", new Date()),
      ),
    [plantilla, config?.nombreProfesional],
  );

  if (consulta.isLoading || !config) {
    return <Skeleton className="h-96 w-full" />;
  }

  function onGuardar() {
    guardar.mutate({
      whatsappPlantilla: plantilla.trim() || null,
      whatsappPrefijoPais: prefijo.trim() || null,
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-5 w-5 text-primary" /> Recordatorio por WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Este es el mensaje que aparece escrito cuando abrís el WhatsApp de un paciente desde
          sus turnos. Podés retocarlo antes de enviarlo, sin cambiar la plantilla.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="plantilla-wa">Mensaje</Label>
          <Textarea
            id="plantilla-wa"
            rows={5}
            maxLength={MAX_LARGO_PLANTILLA_WHATSAPP}
            placeholder={PLANTILLA_WHATSAPP_POR_DEFECTO}
            value={plantilla}
            onChange={(e) => setPlantilla(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Datos que podés insertar:{" "}
            {PLACEHOLDERS_PLANTILLA.map((p) => (
              <span key={p.clave} className="mr-2 inline-block">
                <code className="rounded bg-muted px-1">{`{{${p.clave}}}`}</code>{" "}
                {p.descripcion.toLowerCase()}
              </span>
            ))}
          </p>
        </div>

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
            Sin el «+». Se usa para completar los teléfonos cargados en formato local (Argentina
            es 54).
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Vista previa</Label>
          <p className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">
            {vistaPrevia}
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="button" disabled={guardar.isPending} onClick={onGuardar}>
            Guardar recordatorio
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
