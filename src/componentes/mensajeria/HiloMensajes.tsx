"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Send } from "lucide-react";
import type { MensajeSalidaDto } from "@/aplicacion/dtos/mensajeria.dto";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import { Skeleton } from "@/componentes/ui/skeleton";

function hora(fecha: Date): string {
  return new Date(fecha).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Hilo de mensajes reutilizable (nutri y paciente): burbujas alineadas según
 * el autor, autoscroll al último y un compositor (Enter envía, Shift+Enter
 * hace salto de línea).
 */
export function HiloMensajes({
  mensajes,
  enviando,
  onEnviar,
  cargando = false,
  deshabilitado = false,
  textoVacio = "Todavía no hay mensajes. ¡Escribí el primero!",
}: {
  mensajes: MensajeSalidaDto[];
  enviando: boolean;
  onEnviar: (cuerpo: string) => void;
  cargando?: boolean;
  deshabilitado?: boolean;
  textoVacio?: string;
}) {
  const { data: sesion } = useSession();
  const miId = sesion?.user?.id;
  const [borrador, setBorrador] = useState("");
  const finRef = useRef<HTMLDivElement>(null);

  // Al abrir el hilo, captura (una sola vez) el primer mensaje NO leído del otro,
  // para marcar dónde arrancan los nuevos. Se fija antes de marcarlos como leídos,
  // así el divisor no desaparece cuando `leidoEn` se actualiza.
  const [primerNuevoId, setPrimerNuevoId] = useState<string | null | undefined>(
    undefined,
  );
  useEffect(() => {
    if (primerNuevoId !== undefined || cargando || mensajes.length === 0)
      return;
    const nuevo = mensajes.find(
      (m) => m.autorId !== miId && m.leidoEn === null,
    );
    setPrimerNuevoId(nuevo?.id ?? null);
  }, [cargando, mensajes, miId, primerNuevoId]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes.length]);

  function enviar() {
    const cuerpo = borrador.trim();
    if (!cuerpo || enviando) return;
    onEnviar(cuerpo);
    setBorrador("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-1">
        {cargando ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
          </div>
        ) : mensajes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {textoVacio}
          </p>
        ) : (
          mensajes.map((mensaje) => {
            const mio = mensaje.autorId === miId;
            const esPrimerNuevo = mensaje.id === primerNuevoId;
            return (
              <div key={mensaje.id} className="flex flex-col">
                {esPrimerNuevo && (
                  <div
                    className="my-2 flex items-center gap-2"
                    aria-label="Mensajes nuevos"
                  >
                    <span className="h-px flex-1 bg-primary/40" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Mensajes nuevos
                    </span>
                    <span className="h-px flex-1 bg-primary/40" />
                  </div>
                )}
                <div
                  className={cn(
                    "flex flex-col",
                    mio ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                      mio
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted text-foreground",
                    )}
                  >
                    {mensaje.cuerpo}
                  </div>
                  <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">
                    {hora(mensaje.creadoEn)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={finRef} />
      </div>

      <div className="mt-2 flex items-end gap-2 border-t pt-2">
        <Textarea
          rows={1}
          value={borrador}
          disabled={deshabilitado || enviando}
          placeholder={
            deshabilitado
              ? "Seleccioná una conversación"
              : "Escribí un mensaje…"
          }
          className="max-h-32 min-h-10 resize-none"
          onChange={(e) => setBorrador(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
        />
        <Button
          size="icon"
          onClick={enviar}
          disabled={deshabilitado || enviando || borrador.trim().length === 0}
          aria-label="Enviar mensaje"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
