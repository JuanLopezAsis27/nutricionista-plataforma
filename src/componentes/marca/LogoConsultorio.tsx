import { cn } from "@/lib/utilidades";
import { IsotipoNutriOffice, NombreNutriOffice } from "./MarcaNutriOffice";

/**
 * La marca que muestra es la de la PLATAFORMA, no la de un profesional. Las
 * pantallas donde aparece este logo (login, recuperar contraseña, sin
 * conexión, confirmar turno) se ven antes de saber de qué consultorio se
 * trata, y la app es de muchos: acá decía el nombre de un nutricionista puesto
 * a mano, y los pacientes de cualquier otro consultorio lo veían al entrar. El
 * nombre de cada profesional vive en `nutricionistas.nombre` (migración 74).
 */
export const SUBTITULO_PLATAFORMA = "Gestión para nutricionistas";

interface Props {
  /** "completo" = ícono + nombre + subtítulo; "compacto" = ícono + nombre. */
  variante?: "completo" | "compacto";
  className?: string;
}

/**
 * Marca de la app: el isotipo (el del ícono de la PWA, sin su fondo) +
 * «NutriOffice». Se usa en las pantallas
 * públicas, donde todavía no hay un consultorio al que nombrar.
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
      <IsotipoNutriOffice className="h-16 w-16" />
      <div className={cn(completo && "space-y-0.5")}>
        <NombreNutriOffice className="block font-semibold leading-tight tracking-tight" />
        {completo && (
          <p className="text-xs text-muted-foreground">
            {SUBTITULO_PLATAFORMA}
          </p>
        )}
      </div>
    </div>
  );
}
