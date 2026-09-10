"use client";

import { useState } from "react";
import { skipToken } from "@tanstack/react-query";
import type { EventoIA } from "@/aplicacion/dtos/ia.dto";

/** Lo que se le manda al servidor para pedir una respuesta transmitida. */
export interface EnvioEnVivo {
  pregunta: string;
  conversacionId: string | null;
  /** Identifica este envío; ver `preguntarEnVivoDto`. */
  intentoId: string;
}

interface OpcionesSuscripcion<T> {
  onData: (evento: EventoIA<T>) => void;
  onError: (error: { message: string }) => void;
}

/**
 * La respuesta del asistente mientras se está escribiendo.
 *
 * Lo usan los dos chats de la app —el del paciente y el analítico del
 * profesional— con su propia suscripción, que se pasa como parámetro porque es
 * lo único que cambia entre uno y otro.
 *
 * El envío vive en un estado y no en una variable: mientras hay uno, la
 * suscripción está abierta; cuando llega el `fin` se pone en `null` y eso es lo
 * que la cierra. El `intentoId` nuevo por envío no es decorativo —una
 * suscripción se identifica por el hash de su entrada, así que sin él repetir
 * la misma pregunta en el mismo chat no abriría una segunda.
 *
 * El fallo del asistente llega como un evento `error` que cierra el flujo, no
 * como una excepción: ver `EventoIA`, donde está el motivo.
 *
 * `herramienta` vacía el parcial a propósito: cuando el modelo llama a una
 * herramienta, el texto que venía escribiendo NO forma parte de la respuesta
 * final, y dejarlo en pantalla mostraría algo que después desaparece.
 */
export function useRespuestaEnVivo<T>({
  suscribir,
  alTerminar,
  alFallar,
}: {
  suscribir: (
    entrada: EnvioEnVivo | typeof skipToken,
    opciones: OpcionesSuscripcion<T>,
  ) => unknown;
  alTerminar: (resultado: T) => void;
  alFallar: (mensaje: string) => void;
}): {
  enviar: (pregunta: string, conversacionId: string | null) => void;
  /** Lo que va llegando del modelo; "" mientras todavía no dijo nada. */
  parcial: string;
  enCurso: boolean;
} {
  const [envio, setEnvio] = useState<EnvioEnVivo | null>(null);
  const [parcial, setParcial] = useState("");

  const cerrar = () => {
    setEnvio(null);
    setParcial("");
  };

  suscribir(envio ?? skipToken, {
    onData: (evento) => {
      if (evento.tipo === "texto") {
        setParcial((previo) => previo + evento.texto);
        return;
      }
      if (evento.tipo === "herramienta") {
        setParcial("");
        return;
      }
      cerrar();
      if (evento.tipo === "error") alFallar(evento.mensaje);
      else alTerminar(evento.resultado);
    },
    // Una falla del asistente llega como evento `error` y no por acá: esto
    // cubre lo que pasa ANTES de que el flujo arranque (sesión vencida, cuota,
    // la conexión que no se pudo abrir).
    onError: (error) => {
      cerrar();
      alFallar(error.message);
    },
  });

  return {
    enviar: (pregunta, conversacionId) =>
      setEnvio({ pregunta, conversacionId, intentoId: crypto.randomUUID() }),
    parcial,
    enCurso: envio !== null,
  };
}
