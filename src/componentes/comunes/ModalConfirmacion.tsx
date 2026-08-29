"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/componentes/ui/dialog";
import { Button } from "@/componentes/ui/button";

interface PropsModalConfirmacion {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  textoConfirmar?: string;
  cargando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Modal reutilizable para confirmar acciones destructivas.
 * El botón de confirmar se muestra en rojo (variante destructive).
 */
export function ModalConfirmacion({
  abierto,
  titulo,
  descripcion,
  textoConfirmar = "Eliminar",
  cargando = false,
  onConfirmar,
  onCancelar,
}: PropsModalConfirmacion) {
  return (
    <Dialog open={abierto} onOpenChange={(estado) => !estado && onCancelar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancelar} disabled={cargando}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirmar}
            disabled={cargando}
          >
            {cargando ? "Procesando…" : textoConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
