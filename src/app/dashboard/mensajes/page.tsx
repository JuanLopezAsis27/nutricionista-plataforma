"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MessageSquare,
  ArrowLeft,
  MessageCircle,
  Search,
  UserRound,
} from "lucide-react";
import type { ResumenConversacionDto } from "@/aplicacion/dtos/mensajeria.dto";
import { useMensajeria } from "@/lib/hooks/useMensajeria";
import { cn } from "@/lib/utilidades";
import { HiloMensajes } from "@/componentes/mensajeria/HiloMensajes";
import { HiloWhatsapp } from "@/componentes/mensajeria/HiloWhatsapp";
import { etiquetaRelativa } from "@/componentes/mensajeria/chat";
import { AvatarPerfil } from "@/componentes/comunes/AvatarPerfil";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Skeleton } from "@/componentes/ui/skeleton";

/**
 * Los dos canales de conversación con un paciente.
 *
 * Conviven en la misma pantalla porque son la misma conversación desde la
 * cabeza del profesional ("¿qué hablé con este paciente?"), aunque por debajo
 * sean dos transportes distintos: el chat interno del portal y WhatsApp. El
 * recordatorio de turno se manda por el segundo, así que la respuesta también
 * entra por ahí y desde Recordatorios se llega directo con ?canal=whatsapp.
 */
type Canal = "interno" | "whatsapp";

/**
 * Qué canal abre una fila de la bandeja: el que tiene lo que falta leer y, si
 * no hay nada sin leer, el del último mensaje. Abrir el portal de alguien que
 * acaba de escribir por WhatsApp muestra una conversación vieja y esconde la
 * nueva.
 */
function canalDe(conversacion: ResumenConversacionDto): Canal {
  if (conversacion.noLeidosWhatsapp > 0 && conversacion.noLeidosPortal === 0) {
    return "whatsapp";
  }
  if (conversacion.noLeidosPortal > 0) return "interno";
  return conversacion.ultimoCanal === "WHATSAPP" ? "whatsapp" : "interno";
}

export default function PaginaMensajes() {
  const { conversaciones, hiloDe, enviarA, marcarLeidosDe } = useMensajeria();
  const lista = conversaciones();
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [canal, setCanal] = useState<Canal>("interno");
  const [busqueda, setBusqueda] = useState("");
  const router = useRouter();
  const buscar = useSearchParams();
  const pacienteDelEnlace = buscar.get("paciente");
  const canalDelEnlace = buscar.get("canal");

  // Deep-link desde la campana (?paciente=…, y &canal=whatsapp en los avisos
  // de WhatsApp) y desde el seguimiento de recordatorios: abre esa
  // conversación en el canal pedido y limpia el query de la URL.
  //
  // Se lee de `useSearchParams` y no de `window.location` al montar: tocar un
  // aviso de la campana ESTANDO en Mensajes cambia solo la query, Next no
  // remonta la página, y el efecto de montaje no volvía a correr —el aviso
  // quedaba sin abrir nada—.
  useEffect(() => {
    if (!pacienteDelEnlace) return;
    setPacienteId(pacienteDelEnlace);
    setCanal(canalDelEnlace === "whatsapp" ? "whatsapp" : "interno");
    router.replace("/dashboard/mensajes", { scroll: false });
  }, [pacienteDelEnlace, canalDelEnlace, router]);

  const hilo = hiloDe(
    { pacienteId: pacienteId ?? "" },
    { enabled: Boolean(pacienteId) && canal === "interno" },
  );
  const mensajes = hilo.data?.mensajes ?? [];
  const cantidad = mensajes.length;

  // Marca leídos al abrir un hilo y cuando llegan mensajes nuevos.
  const marcar = marcarLeidosDe.mutate;
  useEffect(() => {
    if (pacienteId && hilo.data) marcar({ pacienteId });
  }, [pacienteId, cantidad, hilo.data, marcar]);

  const conversacionesLista = useMemo(() => lista.data ?? [], [lista.data]);
  const seleccionada = conversacionesLista.find(
    (c) => c.pacienteId === pacienteId,
  );

  // El buscador filtra por nombre y también por el texto del último mensaje:
  // muchas veces se vuelve a una conversación por lo que se dijo ("el análisis
  // de sangre") y no por quién la dijo.
  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return conversacionesLista;
    return conversacionesLista.filter(
      (c) =>
        c.pacienteNombre.toLowerCase().includes(termino) ||
        (c.ultimoMensajeTexto ?? "").toLowerCase().includes(termino),
    );
  }, [conversacionesLista, busqueda]);

  const sinLeer = conversacionesLista.reduce((s, c) => s + c.noLeidos, 0);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <h1 className="mb-3 flex items-center gap-2 text-2xl font-bold">
        <MessageSquare className="h-6 w-6 text-primary" /> Mensajes
        {sinLeer > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
            {sinLeer} sin leer
          </span>
        )}
      </h1>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border bg-card">
        {/* Lista de conversaciones */}
        <aside
          className={cn(
            "flex w-full shrink-0 flex-col border-r md:w-80",
            pacienteId ? "hidden md:flex" : "flex",
          )}
        >
          <div className="border-b p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar paciente o mensaje…"
                aria-label="Buscar conversaciones"
                className="h-9 pl-8"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {lista.isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : conversacionesLista.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Todavía no hay conversaciones. Aparecen cuando un paciente
                escribe o cuando le escribís desde su ficha.
              </p>
            ) : filtradas.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Ninguna conversación coincide con «{busqueda}».
              </p>
            ) : (
              <ul className="divide-y">
                {filtradas.map((conversacion) => {
                  const activa = pacienteId === conversacion.pacienteId;
                  const noLeidos = conversacion.noLeidos > 0;
                  return (
                    <li key={conversacion.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setPacienteId(conversacion.pacienteId);
                          setCanal(canalDe(conversacion));
                        }}
                        aria-current={activa ? "true" : undefined}
                        className={cn(
                          "flex w-full items-center gap-2.5 p-3 text-left transition-colors hover:bg-muted/50",
                          // Barra de color a la izquierda en vez de fondo a
                          // secas: el fondo gris de la activa se confundía con
                          // el hover de cualquier otra fila.
                          activa &&
                            "bg-muted shadow-[inset_3px_0_0_0_hsl(var(--primary))]",
                        )}
                      >
                        {/* Con foto se ve la cara; sin foto, las iniciales.
                            El anillo marca los no leídos, que es lo que antes
                            hacía el fondo del círculo de iniciales. */}
                        <AvatarPerfil
                          nombre={conversacion.pacienteNombre}
                          fotoArchivoId={conversacion.pacienteFotoArchivoId}
                          className={cn(
                            "h-9 w-9",
                            noLeidos && "ring-2 ring-primary ring-offset-1",
                          )}
                        />

                        <div className="min-w-0 flex-1">
                          <p className="flex items-baseline justify-between gap-2">
                            <span
                              className={cn(
                                "truncate text-sm",
                                noLeidos ? "font-bold" : "font-medium",
                              )}
                            >
                              {conversacion.pacienteNombre}
                            </span>
                            {conversacion.ultimoMensajeEn && (
                              <span
                                className={cn(
                                  "shrink-0 text-[10px]",
                                  noLeidos
                                    ? "font-semibold text-primary"
                                    : "text-muted-foreground",
                                )}
                              >
                                {etiquetaRelativa(conversacion.ultimoMensajeEn)}
                              </span>
                            )}
                          </p>
                          <p
                            className={cn(
                              "truncate text-xs",
                              noLeidos
                                ? "font-medium text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {conversacion.ultimoMensajeTexto ?? "—"}
                          </p>
                        </div>

                        {noLeidos && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                            {conversacion.noLeidos > 9
                              ? "9+"
                              : conversacion.noLeidos}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Hilo seleccionado */}
        <section
          className={cn(
            "min-h-0 flex-1 flex-col",
            pacienteId ? "flex" : "hidden md:flex",
          )}
        >
          {!pacienteId ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <MessageSquare className="h-9 w-9 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Elegí una conversación para ver el hilo.
              </p>
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-center gap-2 border-b p-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setPacienteId(null)}
                  aria-label="Volver a la lista"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <AvatarPerfil
                  nombre={
                    hilo.data?.contraparte.nombre ??
                    seleccionada?.pacienteNombre ??
                    "Paciente"
                  }
                  fotoArchivoId={
                    hilo.data?.contraparte.fotoArchivoId ??
                    seleccionada?.pacienteFotoArchivoId
                  }
                  className="h-8 w-8"
                />
                <p className="min-w-0 truncate font-medium">
                  {seleccionada?.pacienteNombre ?? "Paciente"}
                </p>

                {/* La conversación casi siempre lleva a mirar algo de la ficha
                    (el plan, la última medición): sin esto había que volver a
                    Pacientes y buscarlo de nuevo. */}
                <Button asChild variant="ghost" size="sm" className="shrink-0">
                  <Link href={`/dashboard/pacientes/${pacienteId}`}>
                    <UserRound className="h-4 w-4" />
                    <span className="hidden sm:inline">Ver ficha</span>
                  </Link>
                </Button>

                <div className="ml-auto flex rounded-md border p-0.5 text-xs">
                  <BotonCanal
                    activo={canal === "interno"}
                    onClick={() => setCanal("interno")}
                    noLeidos={seleccionada?.noLeidosPortal ?? 0}
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Portal
                  </BotonCanal>
                  <BotonCanal
                    activo={canal === "whatsapp"}
                    onClick={() => setCanal("whatsapp")}
                    noLeidos={seleccionada?.noLeidosWhatsapp ?? 0}
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </BotonCanal>
                </div>
              </header>

              <div className="min-h-0 flex-1 p-3">
                {canal === "whatsapp" ? (
                  <HiloWhatsapp
                    key={`wa-${pacienteId}`}
                    pacienteId={pacienteId}
                  />
                ) : (
                  <HiloMensajes
                    key={pacienteId}
                    mensajes={mensajes}
                    cargando={hilo.isLoading}
                    enviando={enviarA.isPending}
                    onEnviar={(cuerpo) =>
                      enviarA.mutateAsync({ pacienteId, cuerpo })
                    }
                    textoVacio="Todavía no hay mensajes con este paciente. Escribile el primero."
                  />
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function BotonCanal({
  activo,
  onClick,
  noLeidos,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  /** Sin leer de ESE canal: dice dónde está lo nuevo antes de cambiar. */
  noLeidos: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors",
        activo ? "bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      {children}
      {noLeidos > 0 && (
        <span
          className={cn(
            "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
            activo
              ? "bg-primary-foreground text-primary"
              : "bg-primary text-primary-foreground",
          )}
        >
          {noLeidos > 9 ? "9+" : noLeidos}
        </span>
      )}
    </button>
  );
}
