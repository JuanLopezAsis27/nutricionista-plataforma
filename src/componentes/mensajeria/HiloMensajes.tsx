"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Check, CheckCheck, MessagesSquare } from "lucide-react";
import type { MensajeSalidaDto } from "@/aplicacion/dtos/mensajeria.dto";
import { cn } from "@/lib/utilidades";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Compositor } from "./Compositor";
import { agruparPorDia, horaChat } from "./chat";

/** Hasta cuánto se puede estar despegado del fondo y aun así seguir el hilo. */
const MARGEN_FONDO = 120;

/** Un mensaje con lo que hace falta para dibujarlo dentro de su racha. */
interface MensajeEnRacha {
  mensaje: MensajeSalidaDto;
  mio: boolean;
  /** Último de una racha del mismo autor: lleva la cola y la hora. */
  cierra: boolean;
}

/**
 * Hilo de mensajes reutilizable (nutri y paciente).
 *
 * Tres cosas que un chat necesita y acá faltaban:
 *
 * 1. **Separadores de día.** Cada burbuja mostraba solo la hora, así que una
 *    conversación de tres semanas se leía como si todo hubiera pasado hoy.
 * 2. **Rachas.** Tres mensajes seguidos del mismo autor repetían burbuja con
 *    cola y hora tres veces. Ahora la racha se dibuja como un bloque: la cola y
 *    la hora van solo en el último, que es cuando aportan.
 * 3. **Acuse de lectura.** `leidoEn` ya venía en el DTO y no se mostraba: el
 *    que escribe no sabía si del otro lado lo habían abierto.
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
  /** Ver `Compositor`: si devuelve una promesa rechazada, repone el borrador. */
  onEnviar: (cuerpo: string) => void | Promise<unknown>;
  cargando?: boolean;
  deshabilitado?: boolean;
  textoVacio?: string;
}) {
  const { data: sesion } = useSession();
  const miId = sesion?.user?.id;
  const desplazableRef = useRef<HTMLDivElement>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const primerPintadoRef = useRef(true);

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

  /**
   * Autoscroll que no interrumpe: al abrir salta al fondo sin animación (la
   * animación desde arriba de todo era un barrido por meses de conversación),
   * y después solo sigue al último si quien mira ya estaba abajo. Si está
   * leyendo algo viejo, un mensaje nuevo ya no le arranca la pantalla.
   */
  useEffect(() => {
    const caja = desplazableRef.current;
    if (!caja || mensajes.length === 0) return;
    if (primerPintadoRef.current) {
      primerPintadoRef.current = false;
      caja.scrollTop = caja.scrollHeight;
      return;
    }
    const distanciaAlFondo =
      caja.scrollHeight - caja.scrollTop - caja.clientHeight;
    if (distanciaAlFondo <= MARGEN_FONDO) {
      finRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensajes.length]);

  // Días → rachas por autor. `cierra` mira al SIGUIENTE mensaje del mismo día:
  // una racha nunca cruza el separador, porque ahí ya cambió el contexto.
  const dias = useMemo(() => {
    return agruparPorDia(mensajes, (m) => m.creadoEn).map((dia) => ({
      ...dia,
      mensajes: dia.mensajes.map((mensaje, indice): MensajeEnRacha => {
        const siguiente = dia.mensajes[indice + 1];
        return {
          mensaje,
          mio: mensaje.autorId === miId,
          cierra: siguiente == null || siguiente.autorId !== mensaje.autorId,
        };
      }),
    }));
  }, [mensajes, miId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={desplazableRef}
        className="min-h-0 flex-1 overflow-y-auto px-1 pb-2"
      >
        {cargando ? (
          <div className="space-y-2 pt-2">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
            <Skeleton className="h-16 w-3/5" />
          </div>
        ) : mensajes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-8 text-center">
            <MessagesSquare className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{textoVacio}</p>
          </div>
        ) : (
          dias.map((dia) => (
            <section key={dia.clave}>
              <SeparadorDia etiqueta={dia.etiqueta} />
              {dia.mensajes.map(({ mensaje, mio, cierra }) => (
                <div key={mensaje.id}>
                  {mensaje.id === primerNuevoId && <SeparadorNuevos />}
                  <Burbuja mensaje={mensaje} mio={mio} cierra={cierra} />
                </div>
              ))}
            </section>
          ))
        )}
        <div ref={finRef} />
      </div>

      <div className="border-t pt-2">
        <Compositor
          onEnviar={onEnviar}
          enviando={enviando}
          deshabilitado={deshabilitado}
          placeholder={
            deshabilitado
              ? "Seleccioná una conversación"
              : "Escribí un mensaje…"
          }
        />
      </div>
    </div>
  );
}

/**
 * El separador de día. Va pegajoso arriba del scroll: al recorrer un hilo
 * largo, la pregunta "¿de cuándo es esto?" aparece en el medio del día, no
 * cuando se cruza su encabezado.
 */
function SeparadorDia({ etiqueta }: { etiqueta: string }) {
  return (
    <div className="sticky top-0 z-10 flex justify-center py-2">
      <span className="rounded-full border bg-muted/95 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur">
        {etiqueta}
      </span>
    </div>
  );
}

function SeparadorNuevos() {
  return (
    <div className="my-2 flex items-center gap-2" aria-label="Mensajes nuevos">
      <span className="h-px flex-1 bg-primary/40" />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
        Mensajes nuevos
      </span>
      <span className="h-px flex-1 bg-primary/40" />
    </div>
  );
}

function Burbuja({
  mensaje,
  mio,
  cierra,
}: {
  mensaje: MensajeSalidaDto;
  mio: boolean;
  cierra: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col",
        mio ? "items-end" : "items-start",
        // Dentro de una racha las burbujas casi se tocan; entre rachas se abre
        // el aire que separa un turno de habla del otro.
        cierra ? "mb-2.5" : "mb-0.5",
      )}
    >
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[75%]",
          mio
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
          // La cola solo en el último de la racha: es lo que marca dónde
          // termina el turno de habla.
          cierra && (mio ? "rounded-br-sm" : "rounded-bl-sm"),
        )}
      >
        {mensaje.cuerpo}
      </div>
      {cierra && (
        <span className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
          {horaChat(mensaje.creadoEn)}
          {mio &&
            (mensaje.leidoEn ? (
              <CheckCheck className="h-3 w-3 text-primary" aria-label="Leído" />
            ) : (
              <Check className="h-3 w-3" aria-label="Enviado" />
            ))}
        </span>
      )}
    </div>
  );
}
