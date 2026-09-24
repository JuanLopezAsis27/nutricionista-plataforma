import { Leaf } from "lucide-react";
import { cn } from "@/lib/utilidades";

/**
 * Nombre de la PLATAFORMA, no de un profesional. Las pantallas donde aparece
 * este logo (login, recuperar contraseña, sin conexión, confirmar turno) se
 * ven antes de saber de qué consultorio se trata, y la app es de muchos: acá
 * decía el nombre de un nutricionista puesto a mano, y los pacientes de
 * cualquier otro consultorio lo veían al entrar. El nombre de cada profesional
 * vive en `nutricionistas.nombre` (migración 74).
 */
export const NOMBRE_PLATAFORMA = "NutriOffice";
export const SUBTITULO_PLATAFORMA = "Gestión para nutricionistas";

interface Props {
  /** "completo" = insignia + nombre + subtítulo; "compacto" = insignia + nombre. */
  variante?: "completo" | "compacto";
  className?: string;
}

/**
 * Marca de la app: una insignia coral con hoja + el nombre de la plataforma.
 * Se usa en las pantallas públicas, donde todavía no hay un consultorio al que
 * nombrar.
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
        <p className="font-semibold leading-tight tracking-tight">
          {NOMBRE_PLATAFORMA}
        </p>
        {completo && (
          <p className="text-xs text-muted-foreground">
            {SUBTITULO_PLATAFORMA}
          </p>
        )}
      </div>
    </div>
  );
}
