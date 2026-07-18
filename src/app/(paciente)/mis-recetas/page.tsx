"use client";

import { useState } from "react";
import type { RecetaSalidaDto } from "@/aplicacion/dtos/receta.dto";
import { useRecetas } from "@/lib/hooks/useRecetas";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { TarjetaReceta } from "@/componentes/recetas/TarjetaReceta";
import { VistaReceta } from "@/componentes/recetas/VistaReceta";

/** Mis recetas: las recetas que el nutricionista compartió con el paciente. */
export default function PaginaMisRecetas() {
  const { misRecetas } = useRecetas();
  const consulta = misRecetas();
  const [recetaVer, setRecetaVer] = useState<RecetaSalidaDto | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis recetas</h1>
        <p className="text-sm text-muted-foreground">
          Recetas que tu nutricionista compartió con vos.
        </p>
      </div>

      {consulta.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, indice) => (
            <Skeleton key={indice} className="h-52 w-full" />
          ))}
        </div>
      ) : (consulta.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no tenés recetas compartidas.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {consulta.data!.map((receta) => (
            <TarjetaReceta
              key={receta.id}
              receta={receta}
              onVer={() => setRecetaVer(receta)}
            />
          ))}
        </div>
      )}

      <Dialog open={Boolean(recetaVer)} onOpenChange={(abierto) => !abierto && setRecetaVer(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{recetaVer?.nombre}</DialogTitle>
          </DialogHeader>
          {recetaVer && <VistaReceta receta={recetaVer} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
