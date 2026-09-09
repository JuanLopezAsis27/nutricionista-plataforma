"use client";

import { FileText, Link2, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import type { MaterialSalidaDto } from "@/aplicacion/dtos/material.dto";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";

interface Props {
  material: MaterialSalidaDto;
  /** Acciones extra (editar/eliminar/compartir) al final de la fila. */
  acciones?: ReactNode;
}

/**
 * Fila de un material: ícono por tipo, título, categoría/etiquetas y botón
 * de apertura (enlace externo, o archivo servido en línea por
 * /api/archivos/[id]/ver).
 */
export function FilaMaterial({ material, acciones }: Props) {
  const esEnlace = material.tipo === "ENLACE";
  const href = esEnlace
    ? (material.url ?? "#")
    : `/api/archivos/${material.archivo?.id}/ver`;
  const Icono = esEnlace ? Link2 : FileText;

  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <Icono className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-tight">{material.titulo}</p>
        {material.descripcion && (
          <p className="truncate text-sm text-muted-foreground">
            {material.descripcion}
          </p>
        )}
        <div className="mt-1 flex flex-wrap gap-1">
          {material.categoria && (
            <Badge variant="secondary">{material.categoria}</Badge>
          )}
          {material.etiquetas.slice(0, 4).map((etiqueta) => (
            <Badge key={etiqueta} variant="outline" className="text-xs">
              {etiqueta}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button asChild variant="outline" size="sm">
          <a href={href} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Abrir
          </a>
        </Button>
        {acciones}
      </div>
    </li>
  );
}
