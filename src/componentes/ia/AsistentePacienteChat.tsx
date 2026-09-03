"use client";

import { useState } from "react";
import {
  ChevronDown,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useIA } from "@/lib/hooks/useIA";
import { formatearFecha } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Card, CardContent } from "@/componentes/ui/card";
import { Textarea } from "@/componentes/ui/textarea";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { PensandoAnimado } from "@/componentes/ia/PensandoAnimado";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { useHiloDeChat, type TurnoChat } from "./hiloDeChat";

const SUGERENCIAS = [
  "¿Qué puedo comer hoy a la tarde?",
  "¿Con qué reemplazo el arroz del almuerzo?",
  "¿Cómo preparo una de mis recetas?",
];

/**
 * Alto del chat: casi todo el alto visible.
 *
 * Se descuentan las 12rem de lo que hay encima —el título de la pantalla, las
 * pestañas y el padding de `<main>`— y nada más: el chat es lo único que
 * hay en esta pestaña, así que dejarlo corto solo agrega scroll adentro de una
 * página que igual no tiene nada debajo. El mínimo lo protege en una pantalla
 * baja, donde la resta dejaría una tira de pocos renglones.
 */
const ALTO = "h-[calc(100vh-12rem)] min-h-[34rem]";

/**
 * El chat del paciente con el asistente.
 *
 * Sus chats se GUARDAN, igual que los del profesional: los turnos anteriores
 * son a la vez lo que el paciente puede releer —«¿qué me había dicho de la
 * cena?»— y el contexto que se le manda al modelo en la pregunta siguiente.
 * Antes cada pregunta viajaba sola y todo quedaba en una única lista plana que
 * crecía para siempre, sin forma de separar una charla de la otra.
 *
 * La lista de chats se pliega en mobile y queda fija al costado en pantallas
 * anchas: en un teléfono, una columna de títulos al lado del hilo deja los dos
 * ilegibles, y lo que se viene a hacer acá es escribir en el último.
 */
export function AsistentePacienteChat() {
  const {
    preguntar,
    estado,
    misConversaciones,
    miConversacion,
    eliminarMiConversacion,
  } = useIA();
  const activo = estado().data?.asistenteActivo ?? false;
  const listado = misConversaciones();
  const chats = listado.data ?? [];

  const [conversacionId, setConversacionId] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [aEliminar, setAEliminar] = useState<string | null>(null);
  const [listaAbierta, setListaAbierta] = useState(false);

  const abierta = miConversacion(
    { id: conversacionId ?? "" },
    { enabled: conversacionId != null },
  );

  const guardados: TurnoChat[] = (abierta.data?.mensajes ?? []).map((m) => ({
    rol: m.rol,
    contenido: m.contenido,
  }));
  const hilo = useHiloDeChat({
    guardados,
    conversacionId,
    pendiente: preguntar.isPending,
  });
  const { turnos, hiloRef } = hilo;

  function abrir(id: string | null) {
    setConversacionId(id);
    hilo.vaciar();
    setTexto("");
    setListaAbierta(false);
  }

  function enviar(pregunta?: string) {
    const p = (pregunta ?? texto).trim();
    if (!p || preguntar.isPending) return;
    setTexto("");
    hilo.encolarPregunta(p);
    preguntar.mutate(
      { pregunta: p, conversacionId },
      {
        onSuccess: (data) => {
          setConversacionId(data.conversacionId);
          hilo.encolarRespuesta(data.respuesta);
        },
        onError: () => hilo.descartarUltima(),
      },
    );
  }

  const listaDeChats = (
    <ul className="space-y-1">
      {chats.map((chat) => (
        <li key={chat.id} className="group flex items-center gap-1">
          <button
            type="button"
            onClick={() => abrir(chat.id)}
            title={chat.titulo}
            className={cn(
              "min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted",
              chat.id === conversacionId && "bg-muted font-medium",
            )}
          >
            <span className="flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3 shrink-0 text-primary" />
              <span className="truncate">{chat.titulo}</span>
            </span>
            <span className="block pl-[1.125rem] text-[10px] text-muted-foreground">
              {formatearFecha(chat.actualizadoEn)} · {chat.cantidadMensajes}{" "}
              mensajes
            </span>
          </button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
            onClick={() => setAEliminar(chat.id)}
            aria-label={`Eliminar ${chat.titulo}`}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="grid gap-3 lg:grid-cols-[15rem_1fr]">
      {/* --- Mis chats: plegado en mobile, fijo de lg para arriba --- */}
      <div className="lg:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 justify-between"
            onClick={() => setListaAbierta((previo) => !previo)}
            aria-expanded={listaAbierta}
            disabled={chats.length === 0}
          >
            {chats.length === 0
              ? "Todavía no tenés chats guardados"
              : `Mis chats (${chats.length})`}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                listaAbierta && "rotate-180",
              )}
            />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => abrir(null)}
            aria-label="Chat nuevo"
          >
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </div>
        {listaAbierta && chats.length > 0 && (
          <div className="mt-2 rounded-xl border bg-card p-2">
            {listaDeChats}
          </div>
        )}
      </div>

      <Card className={cn("hidden flex-col p-3 lg:flex", ALTO)}>
        <div className="flex items-center justify-between gap-2 px-2 pb-3">
          <span className="text-sm font-semibold">Mis chats</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => abrir(null)}
            title="Chat nuevo"
            aria-label="Chat nuevo"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {listado.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : chats.length === 0 ? (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              Acá van a quedar tus conversaciones para que puedas volver a
              leerlas.
            </p>
          ) : (
            listaDeChats
          )}
        </div>
      </Card>

      {/* --- El hilo --- */}
      <Card className={cn("flex flex-col p-3", ALTO)}>
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div ref={hiloRef} className="flex-1 space-y-3 overflow-y-auto p-1">
            {abierta.isLoading && conversacionId ? (
              <Skeleton className="h-10 w-2/3" />
            ) : turnos.length === 0 && !preguntar.isPending ? (
              <div className="space-y-4 py-8 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </span>
                <p className="text-sm text-muted-foreground">
                  Preguntale al asistente sobre tu plan, tus recetas o tus
                  objetivos.
                  {!activo && " (Por ahora es una demostración.)"}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGERENCIAS.map((sugerencia) => (
                    <button
                      key={sugerencia}
                      type="button"
                      onClick={() => enviar(sugerencia)}
                      className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                    >
                      {sugerencia}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              turnos.map((turno, indice) => (
                <div
                  key={indice}
                  className={cn(
                    "flex",
                    turno.rol === "USUARIO" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={
                      turno.rol === "USUARIO"
                        ? "max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                        : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm"
                    }
                  >
                    {turno.contenido}
                  </div>
                </div>
              ))
            )}
            {preguntar.isPending && <PensandoAnimado />}
          </div>

          <div className="mt-2 flex items-end gap-2 border-t pt-2">
            <Textarea
              rows={1}
              value={texto}
              placeholder="Escribí tu pregunta…"
              className="max-h-32 min-h-10 resize-none"
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar();
                }
              }}
            />
            <Button
              size="icon"
              onClick={() => enviar()}
              disabled={preguntar.isPending || texto.trim().length === 0}
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <ModalConfirmacion
        abierto={aEliminar !== null}
        titulo="Eliminar chat"
        descripcion="Se borra la conversación completa con sus mensajes. No se puede deshacer."
        cargando={eliminarMiConversacion.isPending}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={() => {
          if (!aEliminar) return;
          eliminarMiConversacion.mutate(
            { id: aEliminar },
            {
              onSuccess: () => {
                if (aEliminar === conversacionId) abrir(null);
                setAEliminar(null);
              },
            },
          );
        }}
      />
    </div>
  );
}
