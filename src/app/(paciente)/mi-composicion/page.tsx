"use client";

import { PersonStanding } from "lucide-react";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import { ComposicionPaciente } from "@/componentes/antropometria/ComposicionPaciente";
import { BioimpedanciaPaciente } from "@/componentes/bioimpedancia/BioimpedanciaPaciente";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/componentes/ui/tabs";

/**
 * Portal del paciente: su composición corporal, en lectura. Dos fuentes que no
 * se mezclan —la antropometría (medidas del profesional, con sus objetivos) y
 * la bioimpedancia (lo que informa la balanza)—, cada una en su pestaña.
 */
export default function PaginaMiComposicion() {
  return (
    <div className="space-y-5">
      <EncabezadoPortal
        icono={PersonStanding}
        titulo="Mi composición"
        descripcion="Las mediciones que te toma tu nutricionista en la consulta, tus resultados y cuánto te falta para tus objetivos."
      />

      <Tabs defaultValue="antropometria">
        <TabsList>
          <TabsTrigger value="antropometria">Antropometría</TabsTrigger>
          <TabsTrigger value="bioimpedancia">Bioimpedancia</TabsTrigger>
        </TabsList>
        <TabsContent value="antropometria" className="mt-4">
          <ComposicionPaciente />
        </TabsContent>
        <TabsContent value="bioimpedancia" className="mt-4">
          <BioimpedanciaPaciente />
        </TabsContent>
      </Tabs>
    </div>
  );
}
