"use client";

import { useState } from "react";
import { FolderInput } from "lucide-react";
import type { MaterialSalidaDto } from "@/aplicacion/dtos/material.dto";
import { useBiblioteca } from "@/lib/hooks/useBiblioteca";
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
 * Mueve un material de carpeta desde la lista, sin abrir el editor. Ordenar
 * no es editar (ver `MoverMaterialAGrupo`), y es lo primero que se hace
 * después de crear una carpeta, sobre materiales que ya existen.
 */
export function MoverMaterialACarpeta({
  material,
  onCerrar,
}: {
  material: MaterialSalidaDto | null;
  onCerrar: () => void;
}) {
  const { grupos: listarGrupos, mover } = useBiblioteca();
  const carpetas = listarGrupos();
  const [destino, setDestino] = useState<string | null>(null);

  // El valor arranca en la carpeta actual del material cada vez que se abre.
  const valor = destino ?? material?.grupoId ?? SUELTA;

  function cerrar() {
    setDestino(null);
    onCerrar();
  }

  return (
    <Dialog
      open={material !== null}
      onOpenChange={(abierto) => !abierto && cerrar()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover «{material?.titulo}»</DialogTitle>
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
              if (!material) return;
              mover.mutate(
                {
                  materialId: material.id,
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
