"use client";

import { useEffect } from "react";
import { useMensajeria } from "@/lib/hooks/useMensajeria";
import { HiloMensajes } from "@/componentes/mensajeria/HiloMensajes";
import { HiloWhatsapp } from "@/componentes/mensajeria/HiloWhatsapp";
import { Card } from "@/componentes/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/componentes/ui/tabs";

/**
 * Mensajería con un paciente (ficha del nutricionista): el chat propio de la
 * app y, cuando la Cloud API está conectada, el hilo de WhatsApp.
 */
export function MensajesDePaciente({ pacienteId }: { pacienteId: string }) {
  const { hiloDe, enviarA, marcarLeidosDe } = useMensajeria();
  const hilo = hiloDe({ pacienteId });
  const mensajes = hilo.data?.mensajes ?? [];
  const cantidad = mensajes.length;

  const marcar = marcarLeidosDe.mutate;
  useEffect(() => {
    if (hilo.data) marcar({ pacienteId });
  }, [pacienteId, cantidad, hilo.data, marcar]);

  return (
    <Tabs defaultValue="app" className="space-y-3">
      <TabsList>
        <TabsTrigger value="app">Chat de la app</TabsTrigger>
        <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
      </TabsList>

      <TabsContent value="app">
        <Card className="flex h-[60vh] flex-col p-3">
          <HiloMensajes
            mensajes={mensajes}
            cargando={hilo.isLoading}
            enviando={enviarA.isPending}
            onEnviar={(cuerpo) => enviarA.mutate({ pacienteId, cuerpo })}
            textoVacio="Todavía no hay mensajes con este paciente. Escribile el primero."
          />
        </Card>
      </TabsContent>

      <TabsContent value="whatsapp">
        <Card className="flex h-[60vh] flex-col p-3">
          <HiloWhatsapp pacienteId={pacienteId} />
        </Card>
      </TabsContent>
    </Tabs>
  );
}
