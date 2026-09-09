"use client";

import { useState } from "react";
import type { PlantillaSalidaDto } from "@/aplicacion/dtos/secretaria.dto";
import { useSecretaria } from "@/lib/hooks/useSecretaria";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/componentes/ui/dialog";

/** Diálogo para enviar un email de prueba de una plantilla a una casilla. */
export function EnviarPruebaDialog({
  plantilla,
  onCerrar,
}: {
  plantilla: PlantillaSalidaDto | null;
  onCerrar: () => void;
}) {
  const { enviarPrueba } = useSecretaria();
  const [para, setPara] = useState("");

  function enviar() {
    if (!plantilla) return;
    enviarPrueba.mutate(
      { plantillaId: plantilla.id, para },
      {
        onSuccess: () => {
          setPara("");
          onCerrar();
        },
      },
    );
  }

  return (
    <Dialog open={Boolean(plantilla)} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar prueba</DialogTitle>
          <DialogDescription>
            Se envía «{plantilla?.nombre}» con datos de ejemplo. En desarrollo
            lo ves en Mailpit (localhost:8025).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="para-prueba">Enviar a</Label>
          <Input
            id="para-prueba"
            type="email"
            placeholder="tu@email.com"
            value={para}
            onChange={(e) => setPara(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onCerrar}
            disabled={enviarPrueba.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={enviar}
            disabled={enviarPrueba.isPending || !para.trim()}
          >
            {enviarPrueba.isPending ? "Enviando…" : "Enviar prueba"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
