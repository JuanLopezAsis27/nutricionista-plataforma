import type { Macros } from "@/componentes/comunes/alimentos/macros";

/** Una columna del resumen de macros (total o por porción). */
export function TotalItem({
  etiqueta,
  macros,
}: {
  etiqueta: string;
  macros: Macros;
}) {
  const partes = [
    macros.calorias != null && `${macros.calorias} kcal`,
    macros.proteinasG != null && `${macros.proteinasG} g P`,
    macros.carbohidratosG != null && `${macros.carbohidratosG} g C`,
    macros.grasasG != null && `${macros.grasasG} g G`,
  ].filter(Boolean);
  return (
    <span>
      <span className="text-muted-foreground">{etiqueta}:</span>{" "}
      {partes.join(" · ")}
    </span>
  );
}

/** Una fila editable de ingrediente (nombre + gramos + macros por 100 g). */
