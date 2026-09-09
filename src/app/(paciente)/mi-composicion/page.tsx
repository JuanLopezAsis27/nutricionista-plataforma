"use client";

import { PersonStanding } from "lucide-react";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import { ComposicionPaciente } from "@/componentes/antropometria/ComposicionPaciente";

/** Portal del paciente: su composición corporal y sus objetivos, en lectura. */
export default function PaginaMiComposicion() {
  return (
    <div className="space-y-5">
      <EncabezadoPortal
        icono={PersonStanding}
        titulo="Mi composición"
        descripcion="Las mediciones que te toma tu nutricionista en la consulta, tus resultados y cuánto te falta para tus objetivos."
      />

      <ComposicionPaciente />
    </div>
  );
}
