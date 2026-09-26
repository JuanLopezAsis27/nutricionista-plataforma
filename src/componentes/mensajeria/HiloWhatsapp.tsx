"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCheck,
  AlertTriangle,
  MessageCircle,
  Send,
  Users,
} from "lucide-react";
import type { MensajeWhatsappSalidaDto } from "@/aplicacion/dtos/whatsapp.dto";
import { useWhatsapp } from "@/lib/hooks/useWhatsapp";
import { useRecordatorios } from "@/lib/hooks/useRecordatorios";
import { cn } from "@/lib/utilidades";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Button } from "@/componentes/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentes/ui/select";
import { Compositor } from "./Compositor";
import { agruparPorDia, horaChat } from "./chat";

/**
 * Hilo de WhatsApp con un paciente, dentro de la app.
 *
 * Solo existe con la Cloud API conectada. Fuera de la ventana de 24 h desde el
 * último mensaje del paciente, Meta rechaza el texto libre: se avisa antes en
 * vez de dejar que el envío falle.
 *
 * Comparte con el chat del portal los separadores de día y el compositor: son
 * la misma conversación desde la cabeza del profesional, y dos chats que se
 * escriben distinto obligan a reaprender la pantalla al cambiar de pestaña.
 */
export function HiloWhatsapp({
  pacienteId,
  integrantes,
}: {
  pacienteId: string;
  /**
   * Abierto como el chat de un número compartido (la bandeja): de quiénes es.
   * Entonces cada mensaje dice de qué ficha es, y el aviso de arriba sobra
   * porque el encabezado ya los nombra.
   */
  integrantes?: { pacienteId: string; nombre: string }[];
}) {
  const { hiloDe, enviarMensaje, marcarLeidos } = useWhatsapp();
  const hilo = hiloDe({ pacienteId });
  const finRef = useRef<HTMLDivElement>(null);

  const mensajes = useMemo(() => hilo.data?.mensajes ?? [], [hilo.data]);

  // Abrir el chat es leerlo: los entrantes dejan de contar y el aviso de la
  // campana se da por visto, se haya llegado desde donde sea. Se vuelve a
  // marcar cuando entra uno nuevo con el chat abierto. Depende de la CANTIDAD
  // de entrantes y no de `hilo.data`: marcar invalida las queries, el hilo se
  // vuelve a pedir y una dependencia al objeto lo marcaría otra vez, en loop.
  const entrantes = mensajes.filter((m) => m.direccion === "ENTRANTE").length;
  const cargado = Boolean(hilo.data?.conectado);
  const marcar = marcarLeidos.mutate;
  useEffect(() => {
    if (cargado) marcar({ pacienteId });
  }, [pacienteId, entrantes, cargado, marcar]);
  const dias = useMemo(
    () => agruparPorDia(mensajes, (m) => m.creadoEn),
    [mensajes],
  );

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes.length]);

  if (hilo.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!hilo.data?.conectado) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <MessageCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">WhatsApp no está conectado</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Cargá las credenciales de la API oficial en Integraciones → WhatsApp
          para ver acá los mensajes con tus pacientes. Mientras tanto los
          recordatorios salen como enlaces que abrís vos, desde Recordatorios.
        </p>
      </div>
    );
  }

  const ventanaAbierta = hilo.data.ventanaAbierta;
  // Otras fichas con el mismo número (hermanos con el teléfono de la madre):
  // el hilo es el de todo el número, y cada mensaje dice de qué ficha quedó.
  const compartido = hilo.data.compartidoCon;
  const nombreDeFicha = new Map(
    (integrantes ?? compartido).map((c) => [c.pacienteId, c.nombre] as const),
  );
  // En el chat compartido, cada mensaje dice su ficha; abierto desde la ficha
  // de uno, solo los que quedaron en otra.
  const etiquetaDeFicha = (id: string): string | null => {
    const nombre = nombreDeFicha.get(id);
    if (!nombre) return null;
    return integrantes ? nombre : `En la ficha de ${nombre}`;
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {compartido.length > 0 && !integrantes && (
        <p className="mx-1 mb-2 flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Número compartido con{" "}
            <strong className="text-foreground">
              {compartido.map((c) => c.nombre).join(", ")}
            </strong>
            . Acá se ve toda la conversación con ese número; los mensajes de
            otra ficha lo dicen arriba.
          </span>
        </p>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        {mensajes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-8 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Todavía no hay mensajes de WhatsApp con este paciente.
            </p>
          </div>
        ) : (
          dias.map((dia) => (
            <section key={dia.clave}>
              <div className="sticky top-0 z-10 flex justify-center py-2">
                <span className="rounded-full border bg-muted/95 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur">
                  {dia.etiqueta}
                </span>
              </div>
              {dia.mensajes.map((mensaje) => (
                <Burbuja
                  key={mensaje.id}
                  mensaje={mensaje}
                  deOtraFicha={etiquetaDeFicha(mensaje.pacienteId)}
                />
              ))}
            </section>
          ))
        )}
        <div ref={finRef} />
      </div>

      {!ventanaAbierta && (
        <p className="mb-2 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>
            Pasaron más de 24 h desde el último mensaje del paciente. WhatsApp
            solo permite escribirle con una plantilla aprobada; un texto libre
            va a ser rechazado.
          </span>
        </p>
      )}

      {!ventanaAbierta && <EnviarPlantilla pacienteId={pacienteId} />}

      <div className="border-t pt-2">
        <Compositor
          onEnviar={(cuerpo) =>
            enviarMensaje.mutateAsync({ pacienteId, cuerpo })
          }
          enviando={enviarMensaje.isPending}
          placeholder="Escribí un mensaje de WhatsApp…"
          ayuda={
            ventanaAbierta
              ? undefined
              : "La ventana de 24 h está cerrada: usá una plantilla."
          }
        />
      </div>
    </div>
  );
}

/**
 * Mandar una plantilla aprobada: lo único que Meta acepta con la ventana
 * cerrada. Los datos del turno y los botones se completan en el servidor con
 * el próximo turno del paciente.
 */
function EnviarPlantilla({ pacienteId }: { pacienteId: string }) {
  const { plantillas } = useRecordatorios();
  const { enviarPlantilla } = useWhatsapp();
  const consulta = plantillas();
  const [plantillaId, setPlantillaId] = useState("");

  const aprobadas = (consulta.data ?? []).filter(
    (p) => p.activa && p.admiteEnvioPorApi,
  );
  if (consulta.isLoading) return null;

  if (aprobadas.length === 0) {
    return (
      <p className="mb-2 text-xs text-muted-foreground">
        No tenés plantillas aprobadas en Meta. Creá una en Recordatorios →
        Plantillas.
      </p>
    );
  }

  const elegida = aprobadas.find((p) => p.id === plantillaId);
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <Select value={plantillaId} onValueChange={setPlantillaId}>
        <SelectTrigger className="h-9 min-w-0 flex-1">
          <SelectValue placeholder="Elegí una plantilla aprobada" />
        </SelectTrigger>
        <SelectContent>
          {aprobadas.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        disabled={!elegida || enviarPlantilla.isPending}
        onClick={() =>
          enviarPlantilla.mutate(
            { pacienteId, plantillaId },
            { onSuccess: () => setPlantillaId("") },
          )
        }
      >
        <Send className="h-4 w-4" />
        {enviarPlantilla.isPending ? "Enviando…" : "Enviar plantilla"}
      </Button>
      {elegida?.necesitaTurno && (
        <p className="w-full text-[11px] text-muted-foreground">
          Usa los datos del próximo turno del paciente.
        </p>
      )}
    </div>
  );
}

function Burbuja({
  mensaje,
  deOtraFicha,
}: {
  mensaje: MensajeWhatsappSalidaDto;
  /** De qué ficha es el mensaje, cuando hay que decirlo. */
  deOtraFicha: string | null;
}) {
  const mio = mensaje.direccion === "SALIENTE";
  return (
    <div className={cn("mb-2 flex", mio ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[75%]",
          mio
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted",
        )}
      >
        {deOtraFicha && (
          <p
            className={cn(
              "mb-0.5 text-[10px] font-medium",
              mio ? "text-primary-foreground/80" : "text-muted-foreground",
            )}
          >
            {deOtraFicha}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{mensaje.cuerpo}</p>
        <p
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px]",
            mio ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {horaChat(mensaje.creadoEn)}
          {mio && <IconoEstado estado={mensaje.estado} />}
        </p>
        {mensaje.error && (
          <p className="mt-1 text-[10px] text-destructive">{mensaje.error}</p>
        )}
      </div>
    </div>
  );
}

/** Los mismos tildes que muestra WhatsApp: uno enviado, dos entregado, azul leído. */
function IconoEstado({
  estado,
}: {
  estado: MensajeWhatsappSalidaDto["estado"];
}) {
  if (estado === "FALLIDO")
    return <AlertTriangle className="h-3 w-3 text-destructive" />;
  if (estado === "LEIDO")
    return <CheckCheck className="h-3 w-3 text-sky-300" />;
  if (estado === "ENTREGADO") return <CheckCheck className="h-3 w-3" />;
  if (estado === "ENVIADO") return <Check className="h-3 w-3" />;
  return null;
}
