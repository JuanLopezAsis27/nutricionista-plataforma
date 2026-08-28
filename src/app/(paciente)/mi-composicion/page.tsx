"use client";

import { PersonStanding } from "lucide-react";
import { ComposicionPaciente } from "@/componentes/antropometria/ComposicionPaciente";

/** Portal del paciente: su composición corporal y sus objetivos, en lectura. */
export default function PaginaMiComposicion() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <PersonStanding className="h-6 w-6 text-primary" /> Mi composición
        </h1>
        <p className="text-sm text-muted-foreground">
          Las mediciones que te toma tu nutricionista en la consulta, tus
          resultados y cuánto te falta para tus objetivos.
        </p>
      </div>

      <ComposicionPaciente />
    </div>
  );
}
