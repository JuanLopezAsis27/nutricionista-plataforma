"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";

/** Tope del cuerpo del mensaje, el mismo que valida `mensajeria.dto`. */
const MAXIMO = 4000;

/** A partir de acá se muestra el contador: antes es ruido. */
const AVISAR_DESDE = MAXIMO - 300;

/**
 * La caja de escribir, compartida por el chat del portal y el de WhatsApp.
 *
 * Estaba duplicada en los dos hilos y se habían ido separando: uno arrancaba
 * en una línea y el otro en dos, uno se deshabilitaba y el otro no. Es el
 * control con el que más se interactúa de la pantalla, así que conviene que se
 * comporte igual en los dos lados.
 *
 * El alto lo maneja el propio textarea: crece con lo escrito hasta un tope y
 * después scrollea. Con alto fijo, escribir un párrafo dejaba el principio del
 * mensaje fuera de vista justo cuando hace falta releerlo antes de mandarlo.
 */
export function Compositor({
  onEnviar,
  enviando,
  deshabilitado = false,
  placeholder = "Escribí un mensaje…",
  ayuda,
}: {
  /**
   * Manda el mensaje. Si devuelve una promesa y se rechaza, el borrador se
   * repone: un envío de WhatsApp fuera de la ventana de 24 h vuelve rechazado
   * y perder lo escrito ahí es perder el mensaje entero.
   */
  onEnviar: (cuerpo: string) => void | Promise<unknown>;
  enviando: boolean;
  deshabilitado?: boolean;
  placeholder?: string;
  /** Pie opcional a la izquierda del contador (el aviso de las 24 h, p. ej.). */
  ayuda?: React.ReactNode;
}) {
  const [borrador, setBorrador] = useState("");
  const campoRef = useRef<HTMLTextAreaElement>(null);

  // Auto-alto: se resetea a `auto` antes de medir para que también ACHIQUE al
  // borrar. Va en un efecto de layout para que el salto no se llegue a pintar.
  useLayoutEffect(() => {
    const campo = campoRef.current;
    if (!campo) return;
    campo.style.height = "auto";
    campo.style.height = `${Math.min(campo.scrollHeight, 160)}px`;
  }, [borrador]);

  const cuerpo = borrador.trim();
  const vacio = cuerpo.length === 0;
  const excedido = borrador.length > MAXIMO;

  function enviar() {
    if (vacio || excedido || enviando || deshabilitado) return;
    const resultado = onEnviar(cuerpo);
    // Se limpia enseguida —escribir el siguiente no espera al servidor— y se
    // repone si el envío falla. El error lo avisa el toast del hook.
    setBorrador("");
    campoRef.current?.focus();
    if (resultado instanceof Promise) {
      resultado.catch(() => setBorrador(cuerpo));
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-end gap-2">
        <Textarea
          ref={campoRef}
          rows={1}
          value={borrador}
          disabled={deshabilitado || enviando}
          placeholder={placeholder}
          aria-label="Mensaje"
          className="max-h-40 min-h-10 resize-none py-2"
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
          className="shrink-0"
          onClick={enviar}
          disabled={deshabilitado || enviando || vacio || excedido}
          aria-label="Enviar mensaje"
          title="Enviar (Enter)"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex min-h-4 items-center justify-between gap-3 px-1 text-[11px] text-muted-foreground">
        <span className="min-w-0 truncate">
          {ayuda ?? (
            <>
              <kbd className="rounded border px-1 font-sans">Enter</kbd> envía ·{" "}
              <kbd className="rounded border px-1 font-sans">Shift</kbd>+
              <kbd className="rounded border px-1 font-sans">Enter</kbd> salta
              de línea
            </>
          )}
        </span>
        {borrador.length >= AVISAR_DESDE && (
          <span
            className={cn(
              "shrink-0 tabular-nums",
              excedido && "text-destructive",
            )}
          >
            {borrador.length}/{MAXIMO}
          </span>
        )}
      </div>
    </div>
  );
}
