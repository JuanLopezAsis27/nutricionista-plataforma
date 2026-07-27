"use client";

import { useEffect } from "react";
import { useMensajeria } from "@/lib/hooks/useMensajeria";
import { HiloMensajes } from "@/componentes/mensajeria/HiloMensajes";
import { Card } from "@/componentes/ui/card";

/** Hilo de mensajes con un paciente concreto (para la ficha del nutricionista). */
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
    <Card className="flex h-[60vh] flex-col p-3">
      <HiloMensajes
        mensajes={mensajes}
        cargando={hilo.isLoading}
        enviando={enviarA.isPending}
        onEnviar={(cuerpo) => enviarA.mutate({ pacienteId, cuerpo })}
        textoVacio="Todavía no hay mensajes con este paciente. Escribile el primero."
      />
    </Card>
  );
}
