import { GlassWater } from "lucide-react";
import { cn } from "@/lib/utilidades";

/** Un vaso son 250 ml: es la unidad en la que se carga el agua en la app. */
export const ML_POR_VASO = 250;

/**
 * El agua del día, dibujada en vasos.
 *
 * Se cuenta en vasos porque es como se toma —nadie se acuerda de cuántos
 * mililitros bebió—, y el total en ml lo escribe quien la usa, al lado: es la
 * unidad en la que lo lee el nutricionista.
 *
 * NO hay denominador. El sistema no tiene una meta de hidratación cargada por
 * paciente, así que dibujar «5 de 8» sería inventarle un objetivo que nadie le
 * fijó. Los ocho vasos vacíos que se ven al principio son solo la escala del
 * dibujo: en cuanto toma más, la fila crece.
 */
export function VasosDeAgua({
  ml,
  className,
}: {
  ml: number;
  className?: string;
}) {
  const vasos = Math.floor(ml / ML_POR_VASO);
  return (
    <div
      className={cn("flex flex-wrap items-center gap-1", className)}
      aria-hidden="true"
    >
      {Array.from({ length: Math.max(vasos, 8) }).map((_, indice) => (
        <GlassWater
          key={indice}
          className={cn(
            "h-5 w-5",
            indice < vasos
              ? "fill-sky-500/25 text-sky-600 dark:text-sky-400"
              : "text-muted-foreground/25",
          )}
        />
      ))}
    </div>
  );
}

/** «3 vasos · 750 ml», que es como se lo nombra al lado del dibujo. */
export function textoDeAgua(ml: number): string {
  const vasos = Math.floor(ml / ML_POR_VASO);
  return `${vasos} ${vasos === 1 ? "vaso" : "vasos"} · ${ml} ml`;
}
