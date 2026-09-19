"use client";

import { useRouter } from "next/navigation";
import { FileDown } from "lucide-react";
import type { PlanSalidaDto } from "@/aplicacion/dtos/plan.dto";
import { Button } from "@/componentes/ui/button";
import { VistaPlan } from "@/componentes/planes/VistaPlan";

/**
 * Un plan entero, como lo ve el PACIENTE: el contenido y, si es un plan de la
 * app, el botón para bajarlo en PDF.
 *
 * Existe para que `/mi-plan` —cuando hay un solo plan, que se muestra
 * directo— y `/mi-plan/[id]` —cuando se entra a uno de varios— dibujen lo
 * mismo. Con dos copias, el primer ajuste que se aplicara en una sola haría que
 * el mismo plan se viera distinto según por dónde se llegó.
 */
export function MiPlanCompleto({ plan }: { plan: PlanSalidaDto }) {
  const router = useRouter();

  return (
    <div className="space-y-2">
      {/* Solo para el plan cargado en la app: el plan que subió el
          profesional se ve —y se abre— desde el visor de VistaPlan. */}
      {plan.modalidad === "APP" && (
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <a
              href={`/api/planes/${plan.id}/pdf`}
              target="_blank"
              rel="noreferrer"
            >
              <FileDown className="h-4 w-4" />
              Descargar PDF
            </a>
          </Button>
        </div>
      )}
      <VistaPlan
        plan={plan}
        // La receta del plan lleva a la receta, que tiene su propia pantalla
        // (antes abría un diálogo, y ahí el documento adjunto no entraba).
        onVerReceta={(recetaId) => router.push(`/mis-recetas/${recetaId}`)}
      />
    </div>
  );
}
