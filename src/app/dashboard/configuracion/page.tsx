"use client";

import { use, type ReactNode } from "react";
import { Settings } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/componentes/ui/tabs";
import { FormularioConfiguracion } from "@/componentes/configuracion/FormularioConfiguracion";
import { GestionEstablecimientos } from "@/componentes/configuracion/GestionEstablecimientos";
import { FormularioPdfPlan } from "@/componentes/configuracion/FormularioPdfPlan";
import { ConfiguracionAntropometria } from "@/componentes/configuracion/ConfiguracionAntropometria";
import { FormularioWhatsapp } from "@/componentes/configuracion/FormularioWhatsapp";
import { GestionAxiomas } from "@/componentes/configuracion/GestionAxiomas";
import { GestionPlantillasEmail } from "@/componentes/configuracion/GestionPlantillasEmail";
import { GestionCamposHistoriaClinica } from "@/componentes/configuracion/GestionCamposHistoriaClinica";
import { GestionCamposEvolucion } from "@/componentes/configuracion/GestionCamposEvolucion";
import { FormularioDiarioIA } from "@/componentes/configuracion/FormularioDiarioIA";
import { RespaldoConsultorio } from "@/componentes/configuracion/RespaldoConsultorio";
import { PanelIntegraciones } from "@/componentes/integraciones/PanelIntegraciones";

/**
 * Configuración del consultorio, en cinco pestañas por tema.
 *
 * Eran once, una por formulario, y varias eran una sola tarjeta chica
 * (membrete, prefijo telefónico, análisis del diario): la fila de pestañas se
 * partía en tres renglones y no se encontraba nada. Ahora cada pestaña apila
 * sus secciones, que ya traen su título; las que no lo traían lo reciben acá
 * (`Seccion`).
 *
 * La pestaña inicial sale de `?pestana=`: así llegan la vuelta del OAuth de
 * Google y los enlaces de otras pantallas (`lib/rutas.ts`).
 */
export default function PaginaConfiguracion({
  searchParams,
}: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  const { pestana } = use(searchParams);

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

      <Tabs
        defaultValue={typeof pestana === "string" ? pestana : "consultorio"}
      >
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="consultorio">Consultorio</TabsTrigger>
          <TabsTrigger value="documentos">Documentos y mensajes</TabsTrigger>
          <TabsTrigger value="ficha">Ficha clínica</TabsTrigger>
          <TabsTrigger value="ia">IA y seguimiento</TabsTrigger>
          <TabsTrigger value="integraciones">Integraciones</TabsTrigger>
        </TabsList>

        <TabsContent value="consultorio" className="space-y-8">
          <FormularioConfiguracion />
          <GestionEstablecimientos />
          <RespaldoConsultorio />
        </TabsContent>

        <TabsContent value="documentos" className="space-y-8">
          <FormularioPdfPlan />
          <Seccion titulo="Plantillas de email">
            <GestionPlantillasEmail />
          </Seccion>
          <FormularioWhatsapp />
        </TabsContent>

        <TabsContent value="ficha" className="space-y-8">
          <GestionCamposHistoriaClinica />
          <GestionCamposEvolucion />
          <Seccion titulo="Antropometría">
            <ConfiguracionAntropometria />
          </Seccion>
        </TabsContent>

        <TabsContent value="ia" className="space-y-8">
          <FormularioDiarioIA />
          <Seccion titulo="Base de conocimiento">
            <GestionAxiomas />
          </Seccion>
        </TabsContent>

        <TabsContent value="integraciones">
          <PanelIntegraciones />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Título para las secciones cuyo componente no trae uno propio. */
function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}): ReactNode {
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">{titulo}</h3>
      {children}
    </section>
  );
}
