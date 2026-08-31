"use client";

import { UtensilsCrossed, Flame } from "lucide-react";
import type { ReactNode } from "react";
import type { RecetaSalidaDto } from "@/aplicacion/dtos/receta.dto";
import { Badge } from "@/componentes/ui/badge";
import { Card, CardContent } from "@/componentes/ui/card";

interface PropsTarjetaReceta {
  receta: RecetaSalidaDto;
  onVer: () => void;
  /** Acciones extra (editar/eliminar/compartir) renderizadas al pie. */
  acciones?: ReactNode;
}

/** Tarjeta del recetario: foto principal, nombre, etiquetas y calorías. */
export function TarjetaReceta({ receta, onVer, acciones }: PropsTarjetaReceta) {
  // La portada la resuelve el servidor (elegida, o la primera si no hay).
  const fotoId = receta.fotoPrincipalId;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onVer}
        className="block w-full text-left"
        aria-label={`Ver la receta ${receta.nombre}`}
      >
        {fotoId ? (
          // eslint-disable-next-line @next/next/no-img-element -- ruta dinámica autorizada, no optimizable
          <img
            src={`/api/archivos/${fotoId}/ver`}
            alt={`Foto de ${receta.nombre}`}
            className="h-36 w-full object-cover"
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center bg-muted">
            <UtensilsCrossed className="h-10 w-10 text-muted-foreground/50" />
          </div>
        )}
      </button>
      <CardContent className="space-y-2 p-3">
        <button
          type="button"
          onClick={onVer}
          className="block w-full text-left"
        >
          <p className="font-medium leading-tight">{receta.nombre}</p>
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
          {receta.calorias != null && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Flame className="h-3.5 w-3.5" /> {receta.calorias} kcal
            </span>
          )}
          {receta.etiquetas.slice(0, 3).map((etiqueta) => (
            <Badge key={etiqueta} variant="secondary" className="text-xs">
              {etiqueta}
            </Badge>
          ))}
        </div>
        {acciones && (
          <div className="flex justify-end gap-1 pt-1">{acciones}</div>
        )}
      </CardContent>
    </Card>
  );
}
