"use client";

import { TrendingUp } from "lucide-react";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import { SeccionTracking } from "@/componentes/tracking/SeccionTracking";

/** Portal del paciente: seguimiento activo de su progreso (mobile-first). */
export default function PaginaMiProgreso() {
  return (
    <div className="space-y-5">
      <EncabezadoPortal
        icono={TrendingUp}
        titulo="Mi progreso"
        descripcion="Tu evolución a partir de lo que vas cargando: peso, hábitos y qué tanto seguís tu plan."
      />

      <SeccionTracking />
    </div>
  );
}
