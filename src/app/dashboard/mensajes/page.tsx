"use client";

import { useEffect, useState } from "react";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { useMensajeria } from "@/lib/hooks/useMensajeria";
import { cn } from "@/lib/utilidades";
import { formatearFecha } from "@/lib/formato";
import { HiloMensajes } from "@/componentes/mensajeria/HiloMensajes";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";

export default function PaginaMensajes() {
  const { conversaciones, hiloDe, enviarA, marcarLeidosDe } = useMensajeria();
  const lista = conversaciones();
  const [pacienteId, setPacienteId] = useState<string | null>(null);

  const hilo = hiloDe({ pacienteId: pacienteId ?? "" }, { enabled: Boolean(pacienteId) });
  const mensajes = hilo.data?.mensajes ?? [];
  const cantidad = mensajes.length;

  // Marca leídos al abrir un hilo y cuando llegan mensajes nuevos.
  const marcar = marcarLeidosDe.mutate;
  useEffect(() => {
    if (pacienteId && hilo.data) marcar({ pacienteId });
  }, [pacienteId, cantidad, hilo.data, marcar]);

  const conversacionesLista = lista.data ?? [];
  const seleccionada = conversacionesLista.find((c) => c.pacienteId === pacienteId);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <h1 className="mb-3 flex items-center gap-2 text-2xl font-bold">
        <MessageSquare className="h-6 w-6 text-primary" /> Mensajes
      </h1>

      <div className="flex min-h-0 flex-1 gap-4 rounded-lg border bg-card">
        {/* Lista de conversaciones */}
        <aside
          className={cn(
            "w-full shrink-0 overflow-y-auto border-r md:w-72",
            pacienteId ? "hidden md:block" : "block",
          )}
        >
          {lista.isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : conversacionesLista.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Todavía no hay conversaciones. Aparecen cuando un paciente escribe o cuando le
              escribís desde su ficha.
            </p>
          ) : (
            <ul className="divide-y">
              {conversacionesLista.map((conversacion) => (
                <li key={conversacion.id}>
                  <button
                    type="button"
                    onClick={() => setPacienteId(conversacion.pacienteId)}
                    className={cn(
                      "flex w-full items-start gap-2 p-3 text-left hover:bg-muted/50",
                      pacienteId === conversacion.pacienteId && "bg-muted",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center justify-between gap-2 font-medium">
                        <span className="truncate">{conversacion.pacienteNombre}</span>
                        {conversacion.ultimoMensajeEn && (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatearFecha(conversacion.ultimoMensajeEn)}
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {conversacion.ultimoMensajeTexto ?? "—"}
                      </p>
                    </div>
                    {conversacion.noLeidos > 0 && (
                      <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {conversacion.noLeidos > 9 ? "9+" : conversacion.noLeidos}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Hilo seleccionado */}
        <section
          className={cn(
            "min-h-0 flex-1 flex-col p-3",
            pacienteId ? "flex" : "hidden md:flex",
          )}
        >
          {!pacienteId ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Elegí una conversación para ver el hilo.
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center gap-2 border-b pb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setPacienteId(null)}
                  aria-label="Volver a la lista"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <p className="font-medium">{seleccionada?.pacienteNombre ?? "Paciente"}</p>
              </div>
              <div className="min-h-0 flex-1">
                <HiloMensajes
                  mensajes={mensajes}
                  cargando={hilo.isLoading}
                  enviando={enviarA.isPending}
                  onEnviar={(cuerpo) => enviarA.mutate({ pacienteId, cuerpo })}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
