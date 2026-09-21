"use client";

import { Check } from "lucide-react";
import {
  CAMPOS_PLANTILLA,
  ETIQUETAS_CAMPO_PLANTILLA,
  type CampoPlantilla,
} from "@/dominio/entidades/PlantillaAntropometrica";
import { cn } from "@/lib/utilidades";

/**
 * Los campos agrupados como en el formulario de carga: se destilda mirando la
 * misma partición que después se ve al medir.
 */
const GRUPOS: { titulo: string; campos: CampoPlantilla[] }[] = [
  { titulo: "Básicos", campos: ["tallaCm", "tallaSentadoCm"] },
  {
    titulo: "Pliegues cutáneos",
    campos: CAMPOS_PLANTILLA.filter((c) => c.startsWith("pliegue")),
  },
  {
    titulo: "Perímetros",
    campos: CAMPOS_PLANTILLA.filter((c) => c.startsWith("circ")),
  },
  {
    titulo: "Diámetros óseos",
    campos: CAMPOS_PLANTILLA.filter((c) => c.startsWith("diam")),
  },
];

interface Props {
  campos: ReadonlySet<CampoPlantilla>;
  onAlternar: (campo: CampoPlantilla) => void;
  /**
   * Campos que no se pueden destildar. Es lo que sostiene el piso de un
   * protocolo: en 5 componentes, sacar una medida del fraccionamiento de Kerr
   * no es "una plantilla más corta", es el protocolo sin su resultado.
   */
  bloqueados?: ReadonlySet<CampoPlantilla>;
  motivoBloqueo?: string;
}

/**
 * Grilla de medidas elegibles, compartida por el editor de protocolos y el de
 * plantillas propias. Con una copia por editor, el primer arreglo se aplicaba
 * en uno solo y los dos terminaban ofreciendo campos distintos.
 */
export function SelectorCamposMedicion({
  campos,
  onAlternar,
  bloqueados,
  motivoBloqueo,
}: Props) {
  return (
    <div className="space-y-3">
      {GRUPOS.map((grupo) => (
        <fieldset key={grupo.titulo} className="space-y-2">
          <legend className="text-sm font-semibold">{grupo.titulo}</legend>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {grupo.campos.map((campo) => {
              const activo = campos.has(campo);
              const bloqueado = bloqueados?.has(campo) ?? false;
              return (
                <button
                  key={campo}
                  type="button"
                  role="switch"
                  aria-checked={activo}
                  disabled={bloqueado}
                  title={bloqueado ? motivoBloqueo : undefined}
                  onClick={() => onAlternar(campo)}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                    activo
                      ? "border-primary bg-primary/5 font-medium"
                      : "text-muted-foreground hover:bg-muted/50",
                    bloqueado && "cursor-not-allowed opacity-70",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border",
                      activo
                        ? "border-primary bg-primary text-white"
                        : "border-input",
                    )}
                  >
                    {activo && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 truncate">
                    {ETIQUETAS_CAMPO_PLANTILLA[campo]}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
