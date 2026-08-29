"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send } from "lucide-react";
import { useIA } from "@/lib/hooks/useIA";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Textarea } from "@/componentes/ui/textarea";
import { Button } from "@/componentes/ui/button";
import { PensandoAnimado } from "@/componentes/ia/PensandoAnimado";

const SUGERENCIAS = [
  "¿Qué pacientes tienen turno esta semana?",
  "Resumime el plan activo de un paciente",
  "¿Qué recetas tengo con más de 30 g de proteína?",
];

/**
 * Chat analítico del nutricionista: pregunta sobre sus datos (pacientes, planes,
 * recetas, turnos) y la IA usa herramientas para responder. La conversación vive
 * en memoria (no se persiste); cada pregunta es independiente.
 */
export function AsistenteAnaliticoChat() {
  const { analizar, estado } = useIA();
  const activo = estado().data?.asistenteActivo ?? false;
  const [mensajes, setMensajes] = useState<
    { pregunta: string; respuesta: string }[]
  >([]);
  const [texto, setTexto] = useState("");
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes.length, analizar.isPending]);

  function enviar(pregunta?: string) {
    const p = (pregunta ?? texto).trim();
    if (!p || analizar.isPending) return;
    setTexto("");
    analizar.mutate(
      { pregunta: p },
      {
        onSuccess: (data) =>
          setMensajes((prev) => [
            ...prev,
            { pregunta: p, respuesta: data.respuesta },
          ]),
      },
    );
  }

  return (
    <Card className="flex h-[60vh] flex-col p-3">
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
        <div className="flex-1 space-y-3 overflow-y-auto p-1">
          {mensajes.length === 0 && !analizar.isPending ? (
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
            mensajes.map((m, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-end">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                    {m.pregunta}
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm">
                    {m.respuesta}
                  </div>
                </div>
              </div>
            ))
          )}
          {analizar.isPending && analizar.variables && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                  {analizar.variables.pregunta}
                </div>
              </div>
              <PensandoAnimado />
            </div>
          )}
          <div ref={finRef} />
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
  );
}
