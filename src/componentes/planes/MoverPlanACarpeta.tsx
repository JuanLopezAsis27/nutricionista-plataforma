"use client";

import { useState } from "react";
import { FolderInput } from "lucide-react";
import type { PlanSalidaDto } from "@/aplicacion/dtos/plan.dto";
import { usePlanes } from "@/lib/hooks/usePlanes";
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
const SUELTO = "__suelto__";

/**
 * Mueve un plan de carpeta desde la lista, sin abrir el editor.
 *
 * Ordenar no es editar: pasar un plan de carpeta por el editor completo
 * obligaría a reenviar sus comidas, archivos y recomendaciones enteras para
 * cambiar un campo. Y ordenar es justo lo primero que se hace después de crear
 * una carpeta, sobre planes que ya existen.
 */
export function MoverPlanACarpeta({
  plan,
  onCerrar,
}: {
  plan: PlanSalidaDto | null;
  onCerrar: () => void;
}) {
  const { grupos: listarGrupos, mover } = usePlanes();
  const carpetas = listarGrupos();
  const [destino, setDestino] = useState<string | null>(null);

  // El valor arranca en la carpeta actual del plan cada vez que se abre.
  const valor = destino ?? plan?.grupoId ?? SUELTO;

  function cerrar() {
    setDestino(null);
    onCerrar();
  }

  return (
    <Dialog
      open={plan !== null}
      onOpenChange={(abierto) => !abierto && cerrar()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover «{plan?.nombre}»</DialogTitle>
        </DialogHeader>

        <Select value={valor} onValueChange={setDestino}>
          <SelectTrigger aria-label="Carpeta de destino">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SUELTO}>Sin carpeta</SelectItem>
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
              if (!plan) return;
              mover.mutate(
                { planId: plan.id, grupoId: valor === SUELTO ? null : valor },
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
