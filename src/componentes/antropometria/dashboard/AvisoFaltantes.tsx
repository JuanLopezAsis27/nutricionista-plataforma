import { TriangleAlert } from "lucide-react";
import type { BloqueFaltante } from "@/dominio/servicios/composicionCorporal";

const ETIQUETAS_BLOQUE: Record<BloqueFaltante["bloque"], string> = {
  FRACCIONAMIENTO: "Fraccionamiento en 5 masas",
  SOMATOTIPO: "Somatotipo",
  ENERGIA: "Metabolismo y peso ideal",
  INDICES: "Índices",
};

/** Qué medidas hacen falta para completar los bloques que no se calcularon. */
export function AvisoFaltantes({ faltantes }: { faltantes: BloqueFaltante[] }) {
  const conFaltas = faltantes.filter((f) => f.campos.length > 0);
  if (conFaltas.length === 0) return null;

  return (
    <div className="flex gap-3 rounded-md border border-dashed p-3 text-sm">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 space-y-1">
        <p className="font-medium">Esta medición no alcanza para todo</p>
        {conFaltas.map((bloque) => (
          <p key={bloque.bloque} className="text-xs text-muted-foreground">
            <span className="font-medium">
              {ETIQUETAS_BLOQUE[bloque.bloque]}:
            </span>{" "}
            falta {bloque.campos.join(", ").toLowerCase()}.
          </p>
        ))}
      </div>
    </div>
  );
}
