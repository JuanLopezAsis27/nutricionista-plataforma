"use client";

import { Settings } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/componentes/ui/tabs";
import { FormularioConfiguracion } from "@/componentes/configuracion/FormularioConfiguracion";
import { FormularioPdfPlan } from "@/componentes/configuracion/FormularioPdfPlan";
import { FormularioWhatsapp } from "@/componentes/configuracion/FormularioWhatsapp";
import { GestionAxiomas } from "@/componentes/configuracion/GestionAxiomas";
import { GestionPlantillasEmail } from "@/componentes/configuracion/GestionPlantillasEmail";
import { GestionCamposHistoriaClinica } from "@/componentes/configuracion/GestionCamposHistoriaClinica";

/** Configuración del consultorio: turnos, membrete y base de conocimiento. */
export default function PaginaConfiguracion() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Settings className="h-6 w-6 text-primary" /> Configuración
        </h1>
        <p className="text-sm text-muted-foreground">
          Preferencias del consultorio y base de conocimiento para el
          seguimiento.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Turnos y membrete</TabsTrigger>
          <TabsTrigger value="pdf">PDF del plan</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="emails">Plantillas de email</TabsTrigger>
          <TabsTrigger value="historia">Historia clínica</TabsTrigger>
          <TabsTrigger value="axiomas">Base de conocimiento</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <FormularioConfiguracion />
        </TabsContent>

        <TabsContent value="pdf">
          <FormularioPdfPlan />
        </TabsContent>

        <TabsContent value="whatsapp">
          <FormularioWhatsapp />
        </TabsContent>

        <TabsContent value="emails">
          <GestionPlantillasEmail />
        </TabsContent>

        <TabsContent value="historia">
          <GestionCamposHistoriaClinica />
        </TabsContent>

        <TabsContent value="axiomas">
          <GestionAxiomas />
        </TabsContent>
      </Tabs>
    </div>
  );
}
