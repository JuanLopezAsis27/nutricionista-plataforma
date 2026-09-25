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
  const { hiloDe, enviarA, marcarLeidosDe, conversaciones } = useMensajeria();
  // Los sin leer de cada canal salen de la bandeja, que ya los trae por
  // paciente: así las pestañas dicen dónde está lo nuevo antes de abrirlas.
  const fila = conversaciones().data?.find((c) => c.pacienteId === pacienteId);
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
        <TabsTrigger value="app" className="gap-1.5">
          Chat de la app
          <ContadorPestana cantidad={fila?.noLeidosPortal ?? 0} />
        </TabsTrigger>
        <TabsTrigger value="whatsapp" className="gap-1.5">
          WhatsApp
          <ContadorPestana cantidad={fila?.noLeidosWhatsapp ?? 0} />
        </TabsTrigger>
      </TabsList>

      <TabsContent value="app">
        <Card className="flex h-[60vh] flex-col p-3">
          <HiloMensajes
            mensajes={mensajes}
            cargando={hilo.isLoading}
            enviando={enviarA.isPending}
            onEnviar={(cuerpo) => enviarA.mutateAsync({ pacienteId, cuerpo })}
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

function ContadorPestana({ cantidad }: { cantidad: number }) {
  if (cantidad === 0) return null;
  return (
    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
      {cantidad > 9 ? "9+" : cantidad}
    </span>
  );
}
