"use client";

import { useEffect, useState } from "react";
import { Send, CircleAlert } from "lucide-react";
import { useRecordatorios } from "@/lib/hooks/useRecordatorios";
import { MAX_LARGO_CUERPO_PLANTILLA } from "@/dominio/entidades/PlantillaWhatsapp";
import { Button } from "@/componentes/ui/button";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";

/**
 * Retocar el texto antes de mandárselo a UN paciente.
 *
 * Existe porque el mensaje de la plantilla no siempre sirve tal cual: "te
 * espero el martes" cambia si el paciente ya avisó que llega tarde, y obligar
 * a editar la plantilla —que es de todos— para decirle algo a uno solo es
 * desproporcionado.
 *
 * La vista previa es una LECTURA: pide el texto armado, no manda nada. Mandar
 * es apretar el botón.
 */
export function DialogoEnviarRecordatorio({
  turnoId,
  plantillaId,
  onCerrar,
}: {
  turnoId: string | null;
  plantillaId: string | null;
  onCerrar: () => void;
}) {
  const { vistaPrevia, enviarIndividual } = useRecordatorios();
  const previa = vistaPrevia(
    { turnoId: turnoId ?? "", plantillaId },
    { enabled: Boolean(turnoId) },
  );

  const [mensaje, setMensaje] = useState("");
  const [editado, setEditado] = useState(false);

  // El texto se carga una vez por turno: refrescar la consulta no puede pisar
  // lo que el profesional está escribiendo.
  useEffect(() => {
    setMensaje(previa.data?.mensaje ?? "");
    setEditado(false);
  }, [previa.data?.mensaje]);

  const datos = previa.data;

  return (
    <Dialog
      open={Boolean(turnoId)}
      onOpenChange={(abierto) => !abierto && onCerrar()}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {datos
              ? `Recordatorio para ${datos.nombrePaciente}`
              : "Recordatorio"}
          </DialogTitle>
        </DialogHeader>

        {previa.isLoading || !datos ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mensaje-recordatorio">Mensaje</Label>
              <Textarea
                id="mensaje-recordatorio"
                rows={6}
                maxLength={MAX_LARGO_CUERPO_PLANTILLA}
                value={mensaje}
                onChange={(e) => {
                  setMensaje(e.target.value);
                  setEditado(true);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Se manda a +{datos.telefono}. Editar acá no cambia la plantilla.
              </p>
            </div>

            {/* Retocar el texto lo baja a mensaje libre, y eso fuera de la
                ventana de 24 h la API lo rechaza: se avisa antes de que falle. */}
            {editado && datos.usaPlantillaAprobada && datos.modo === "API" && (
              <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs">
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>
                  Al editar el texto deja de salir como plantilla aprobada de
                  Meta y se manda como mensaje libre. Si el paciente no te
                  escribió en las últimas 24 h, WhatsApp lo va a rechazar.
                  Dejalo sin tocar para que salga por la vía aprobada.
                </span>
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onCerrar}>
                Cancelar
              </Button>
              <Button
                disabled={mensaje.trim() === "" || enviarIndividual.isPending}
                onClick={() =>
                  enviarIndividual.mutate(
                    {
                      turnoId: datos.turnoId,
                      plantillaId,
                      // Sin tocar, va null para que salga por la plantilla.
                      mensaje: editado ? mensaje : null,
                    },
                    { onSuccess: onCerrar },
                  )
                }
              >
                <Send className="h-4 w-4" />
                {enviarIndividual.isPending ? "Enviando…" : "Enviar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
