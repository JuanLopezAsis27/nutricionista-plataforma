"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/componentes/ui/tabs";
import { FormularioEcuacionesGrasa } from "./FormularioEcuacionesGrasa";
import { FormularioProtocolosMedicion } from "./FormularioProtocolosMedicion";
import { GestorPlantillasAntropometria } from "./GestorPlantillasAntropometria";

/**
 * Antropometría del consultorio: las tres decisiones que valen para TODOS los
 * pacientes y por eso viven acá y no en la ficha de uno.
 *
 * - **Protocolos**: qué medidas pide cada uno de los dos protocolos.
 * - **Plantillas**: juegos de campos propios, que se ofrecen en cada carga.
 * - **Ecuaciones**: cuáles de las de grasa se calculan y se muestran.
 *
 * Las plantillas estaban en una pestaña de la ficha del paciente, que es donde
 * se USAN: se administraban desde adentro de un paciente cualquiera aunque no
 * tuvieran nada que ver con él, y quedaban invisibles hasta abrir una ficha.
 */
export function ConfiguracionAntropometria() {
  return (
    <Tabs defaultValue="protocolos" className="mt-4">
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="protocolos">Protocolos</TabsTrigger>
        <TabsTrigger value="plantillas">Plantillas de carga</TabsTrigger>
        <TabsTrigger value="ecuaciones">Ecuaciones de grasa</TabsTrigger>
      </TabsList>

      <TabsContent value="protocolos" className="mt-4">
        <FormularioProtocolosMedicion />
      </TabsContent>

      <TabsContent value="plantillas" className="mt-4">
        <GestorPlantillasAntropometria />
      </TabsContent>

      <TabsContent value="ecuaciones" className="mt-4">
        <FormularioEcuacionesGrasa />
      </TabsContent>
    </Tabs>
  );
}
