"use client";

import { BellRing } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/componentes/ui/tabs";
import { ConsolaEnvio } from "@/componentes/recordatorios/ConsolaEnvio";
import { ConfiguracionMedios } from "@/componentes/recordatorios/ConfiguracionMedios";
import { GestionPlantillas } from "@/componentes/recordatorios/GestionPlantillas";
import { BandejaSeguimiento } from "@/componentes/recordatorios/BandejaSeguimiento";
import { HistorialEmails } from "@/componentes/recordatorios/HistorialEmails";
import { PlantillaEmailRecordatorio } from "@/componentes/recordatorios/PlantillaEmailRecordatorio";

/**
 * Recordatorios de turno: la ÚNICA pantalla de la tarea de avisar.
 *
 * Absorbió a Secretaría, que era media tarea en otro lado: ahí vivían el texto
 * del recordatorio por email y un segundo botón para dispararlo, mientras que
 * acá estaban los de WhatsApp y el resto de la política. Dos pantallas para
 * decidir lo mismo obligaban a mantener dos mensajes sincronizados a mano y
 * dejaban dos botones que podían mandarle el aviso dos veces al paciente.
 *
 * Lo que quedó afuera es lo que no es un recordatorio: los emails del
 * consultorio (bienvenida y plantillas propias) están en Configuración, y las
 * conversaciones en Mensajes —desde Seguimiento se salta a la de cada uno—.
 */
export default function PaginaRecordatorios() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <BellRing className="h-6 w-6 text-primary" /> Recordatorios
        </h1>
        <p className="text-sm text-muted-foreground">
          Avisos de turno por WhatsApp, email y calendario: a quién, cuándo y
          con qué texto.
        </p>
      </div>

      <Tabs defaultValue="enviar">
        <TabsList>
          <TabsTrigger value="enviar">Enviar</TabsTrigger>
          <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
          <TabsTrigger value="programacion">Programación</TabsTrigger>
          <TabsTrigger value="plantillas">Plantillas</TabsTrigger>
        </TabsList>

        <TabsContent value="enviar" className="mt-4">
          <ConsolaEnvio />
        </TabsContent>
        <TabsContent value="seguimiento" className="mt-4 space-y-4">
          <BandejaSeguimiento />
          <HistorialEmails />
        </TabsContent>
        <TabsContent value="programacion" className="mt-4">
          <ConfiguracionMedios />
        </TabsContent>
        <TabsContent value="plantillas" className="mt-4 space-y-6">
          <GestionPlantillas />
          <PlantillaEmailRecordatorio />
        </TabsContent>
      </Tabs>
    </div>
  );
}
