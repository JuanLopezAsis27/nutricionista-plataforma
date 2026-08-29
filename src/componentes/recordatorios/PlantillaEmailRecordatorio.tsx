"use client";

import { useState } from "react";
import { Mail, Pencil, Send } from "lucide-react";
import type { PlantillaSalidaDto } from "@/aplicacion/dtos/secretaria.dto";
import { CLAVE_RECORDATORIO_TURNO } from "@/dominio/entidades/PlantillaEmail";
import { useSecretaria } from "@/lib/hooks/useSecretaria";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { FormularioPlantilla } from "@/componentes/secretaria/FormularioPlantilla";
import { EnviarPruebaDialog } from "@/componentes/secretaria/EnviarPruebaDialog";

/**
 * El texto del recordatorio POR EMAIL, junto a los de WhatsApp.
 *
 * Es una plantilla de email como cualquier otra, pero es la única que compone
 * un recordatorio: tenerla en otra pantalla obligaba a saltar entre Secretaría
 * y Recordatorios para editar dos textos que dicen lo mismo por dos vías. Las
 * demás plantillas de email (bienvenida y las propias) siguen siendo del
 * consultorio y viven en Configuración.
 */
export function PlantillaEmailRecordatorio() {
  const { listarPlantillas } = useSecretaria();
  const consulta = listarPlantillas();
  const [editando, setEditando] = useState(false);
  const [prueba, setPrueba] = useState<PlantillaSalidaDto | null>(null);

  const plantilla = (consulta.data ?? []).find(
    (p) => p.clave === CLAVE_RECORDATORIO_TURNO,
  );

  if (consulta.isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }
  if (!plantilla) {
    return (
      <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
        Falta la plantilla de email{" "}
        <span className="font-mono">RECORDATORIO_TURNO</span>. Sin ella el
        recordatorio por email no sale.
      </p>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-5 w-5 text-primary" /> Email · {plantilla.nombre}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            <span className="text-muted-foreground">Asunto: </span>
            {plantilla.asunto}
          </p>
          <div
            className="max-h-48 overflow-y-auto rounded-md border bg-muted/40 p-3 text-sm"
            // El cuerpo es HTML que escribió el propio profesional para sus
            // pacientes: se muestra tal cual para que la vista previa sea fiel.
            dangerouslySetInnerHTML={{ __html: plantilla.cuerpoHtml }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditando(true)}
            >
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPrueba(plantilla)}
            >
              <Send className="h-4 w-4" /> Enviar prueba
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar el recordatorio por email</DialogTitle>
          </DialogHeader>
          <FormularioPlantilla
            plantillaInicial={plantilla}
            onTerminado={() => setEditando(false)}
          />
        </DialogContent>
      </Dialog>

      <EnviarPruebaDialog plantilla={prueba} onCerrar={() => setPrueba(null)} />
    </>
  );
}
