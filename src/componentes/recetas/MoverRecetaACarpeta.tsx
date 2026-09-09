"use client";

import { useState } from "react";
import { FolderInput } from "lucide-react";
import type { RecetaSalidaDto } from "@/aplicacion/dtos/receta.dto";
import { useRecetas } from "@/lib/hooks/useRecetas";
import { Button } from "@/componentes/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";

/** Sentinela: Radix Select no admite value="". */
const SUELTA = "__suelta__";

/**
 * Mueve una receta de carpeta desde la lista, sin abrir el editor.
 *
 * Ordenar no es editar: pasar una receta de carpeta por el editor completo
 * obligaría a reenviar sus ingredientes, fotos y preparación enteros para
 * cambiar un campo. Y ordenar es justo lo primero que se hace después de crear
 * una carpeta, sobre recetas que ya existen.
 */
export function MoverRecetaACarpeta({
  receta,
  onCerrar,
}: {
  receta: RecetaSalidaDto | null;
  onCerrar: () => void;
}) {
  const { grupos: listarGrupos, mover } = useRecetas();
  const carpetas = listarGrupos();
  const [destino, setDestino] = useState<string | null>(null);

  // El valor arranca en la carpeta actual de la receta cada vez que se abre.
  const valor = destino ?? receta?.grupoId ?? SUELTA;

  function cerrar() {
    setDestino(null);
    onCerrar();
  }

  return (
    <Dialog
      open={receta !== null}
      onOpenChange={(abierto) => !abierto && cerrar()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover «{receta?.nombre}»</DialogTitle>
        </DialogHeader>

        <Select value={valor} onValueChange={setDestino}>
          <SelectTrigger aria-label="Carpeta de destino">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SUELTA}>Sin carpeta</SelectItem>
            {(carpetas.data ?? []).map((carpeta) => (
              <SelectItem key={carpeta.id} value={carpeta.id}>
                {carpeta.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={mover.isPending}
            onClick={() => {
              if (!receta) return;
              mover.mutate(
                {
                  recetaId: receta.id,
                  grupoId: valor === SUELTA ? null : valor,
                },
                { onSuccess: cerrar },
              );
            }}
          >
            <FolderInput className="h-4 w-4" />
            Mover
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
