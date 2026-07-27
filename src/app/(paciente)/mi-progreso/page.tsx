"use client";

import { TrendingUp } from "lucide-react";
import { SeccionTracking } from "@/componentes/tracking/SeccionTracking";

/** Portal del paciente: seguimiento activo de su progreso (mobile-first). */
export default function PaginaMiProgreso() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <TrendingUp className="h-6 w-6 text-primary" /> Mi progreso
        </h1>
        <p className="text-sm text-muted-foreground">
          Tu evolución a partir de lo que vas cargando: peso, hábitos y qué tanto seguís tu
          plan.
        </p>
      </div>

      <SeccionTracking />
    </div>
  );
}
