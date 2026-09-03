"use client";

import { useState } from "react";
import { Bot, Send, Plus, Trash2, MessageSquare } from "lucide-react";
import { useIA } from "@/lib/hooks/useIA";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Textarea } from "@/componentes/ui/textarea";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { PensandoAnimado } from "@/componentes/ia/PensandoAnimado";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { formatearFecha } from "@/lib/formato";
import { useHiloDeChat, type TurnoChat } from "./hiloDeChat";

const SUGERENCIAS = [
  "¿Qué pacientes tienen turno esta semana?",
  "Resumime el plan activo de un paciente",
  "¿Qué recetas tengo con más de 30 g de proteína?",
];

/**
 * Alto de las dos columnas, en una constante para que no se desincronicen.
 *
 * Se descuentan del viewport las 13rem que ocupa todo lo que hay encima en
 * escritorio: la barra superior (`h-16`), el padding de `<main>` (`p-6` arriba
 * y abajo) y el título de la pantalla con su separación. Así el chat llega
 * hasta el borde de lo visible sin desbordar. El mínimo lo protege en una
 * pantalla baja, donde la resta dejaría una tira de dos renglones.
 */
const ALTO = "h-[calc(100vh-13rem)] min-h-[420px]";

/**
 * Chat analítico del nutricionista.
 *
 * La conversación se GUARDA y se puede retomar: los turnos anteriores son a la
 * vez el historial que el profesional relee y el contexto que se le manda al
 * modelo en la pregunta siguiente. Antes vivía en memoria y cada pregunta
 * viajaba sola, así que el asistente no recordaba nada y al recargar la
 * pantalla se perdía todo lo analizado.
 */
export function AsistenteAnaliticoChat() {
  const {
    analizar,
    estado,
    conversaciones,
    conversacion,
    eliminarConversacion,
  } = useIA();
  const activo = estado().data?.asistenteActivo ?? false;
  const listado = conversaciones();

  const [conversacionId, setConversacionId] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [aEliminar, setAEliminar] = useState<string | null>(null);

  const abierta = conversacion(
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
    pendiente: analizar.isPending,
  });
  const { turnos, hiloRef } = hilo;

  function abrir(id: string | null) {
    setConversacionId(id);
    hilo.vaciar();
    setTexto("");
  }

  function enviar(pregunta?: string) {
    const p = (pregunta ?? texto).trim();
    if (!p || analizar.isPending) return;
    setTexto("");
    hilo.encolarPregunta(p);
    analizar.mutate(
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

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      {/* --- Conversaciones guardadas --- */}
      <Card className={`flex flex-col p-3 ${ALTO}`}>
        <CardHeader className="p-2 pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-sm">
            Conversaciones
            <Button
              size="sm"
              variant="ghost"
              onClick={() => abrir(null)}
              title="Conversación nueva"
              aria-label="Conversación nueva"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
          {listado.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (listado.data?.length ?? 0) === 0 ? (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              Todavía no hay conversaciones guardadas.
            </p>
          ) : (
            <ul className="space-y-1">
              {listado.data?.map((c) => (
                <li key={c.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => abrir(c.id)}
                    className={`flex-1 truncate rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted ${
                      c.id === conversacionId ? "bg-muted font-medium" : ""
                    }`}
                    title={c.titulo}
                  >
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{c.titulo}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatearFecha(c.actualizadoEn)} · {c.cantidadMensajes}{" "}
                      mensajes
                    </span>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={() => setAEliminar(c.id)}
                    aria-label={`Eliminar ${c.titulo}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* --- El chat --- */}
      <Card className={`flex flex-col p-3 ${ALTO}`}>
        <CardHeader className="p-2 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-primary" /> Asistente analítico
            {!activo && (
              <span className="text-xs font-normal text-muted-foreground">
                (demostración)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div ref={hiloRef} className="flex-1 space-y-3 overflow-y-auto p-1">
            {turnos.length === 0 && !analizar.isPending ? (
              <div className="space-y-3 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Preguntá sobre tus pacientes, planes, recetas o turnos.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGERENCIAS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => enviar(s)}
                      className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              turnos.map((t, i) => (
                <div
                  key={i}
                  className={`flex ${t.rol === "USUARIO" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={
                      t.rol === "USUARIO"
                        ? "max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                        : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm"
                    }
                  >
                    {t.contenido}
                  </div>
                </div>
              ))
            )}
            {analizar.isPending && <PensandoAnimado />}
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
              disabled={analizar.isPending || texto.trim().length === 0}
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <ModalConfirmacion
        abierto={aEliminar !== null}
        titulo="Eliminar conversación"
        descripcion="Se borra el chat completo con sus mensajes. No se puede deshacer."
        cargando={eliminarConversacion.isPending}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={() => {
          if (!aEliminar) return;
          eliminarConversacion.mutate(
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
