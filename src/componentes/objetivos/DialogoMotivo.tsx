"use client";

import { useState } from "react";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import { Label } from "@/componentes/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";

interface Props {
  abierto: boolean;
  titulo: string;
  descripcion?: string;
  cargando?: boolean;
  onCancelar: () => void;
  /** Se invoca con el motivo ya validado (no vacío). */
  onConfirmar: (motivo: string) => void;
}

/**
 * Diálogo que exige un MOTIVO antes de confirmar (regla de auditoría de los
 * objetivos: todo cambio de estado queda documentado).
 */
export function DialogoMotivo({
  abierto,
  titulo,
  descripcion,
  cargando,
  onCancelar,
  onConfirmar,
}: Props) {
  const [motivo, setMotivo] = useState("");
  const valido = motivo.trim().length > 0;

  function cerrar() {
    setMotivo("");
    onCancelar();
  }

  return (
    <Dialog open={abierto} onOpenChange={(estaAbierto) => !estaAbierto && cerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
        <div className="space-y-1.5">
          <Label htmlFor="motivo-cambio">Motivo (queda en el historial)</Label>
          <Textarea
            id="motivo-cambio"
            rows={3}
            placeholder="¿Por qué se hace este cambio?"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={cerrar} disabled={cargando}>
            Cancelar
          </Button>
          <Button
            disabled={!valido || cargando}
            onClick={() => {
              onConfirmar(motivo.trim());
              setMotivo("");
            }}
          >
            {cargando ? "Guardando…" : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
