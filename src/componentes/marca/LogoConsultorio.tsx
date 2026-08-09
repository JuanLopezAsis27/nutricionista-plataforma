import { Leaf } from "lucide-react";
import { cn } from "@/lib/utilidades";

export const NOMBRE_PROFESIONAL = "Lic. Nicolás López Asis";
export const SUBTITULO_PROFESIONAL = "Nutrición deportiva y clínica";

interface Props {
  /** "completo" = insignia + nombre + subtítulo; "compacto" = insignia + nombre. */
  variante?: "completo" | "compacto";
  className?: string;
}

/**
 * Marca del consultorio: una insignia coral con hoja + el nombre del profesional.
 * Se usa en el login y en las barras de navegación para identificar la app como
 * perteneciente al Lic. Nicolás López Asis.
 */
export function LogoConsultorio({ variante = "completo", className }: Props) {
  const completo = variante === "completo";
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        completo && "flex-col text-center",
        className,
      )}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        <Leaf className="h-6 w-6" />
      </span>
      <div className={cn(completo && "space-y-0.5")}>
        <p className="font-semibold leading-tight tracking-tight">{NOMBRE_PROFESIONAL}</p>
        {completo && (
          <p className="text-xs text-muted-foreground">{SUBTITULO_PROFESIONAL}</p>
        )}
      </div>
    </div>
  );
}
