"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Formatos que se le piden a `MediaRecorder`, en orden de preferencia.
 *
 * Opus a 32 kbps mono es lo que hace que una consulta de una hora entren en
 * ~14 MB, debajo del tope de 25 MB del proveedor de transcripción. Sin fijar
 * el códec, Chrome elige una tasa bastante más alta y una consulta larga no
 * entra.
 *
 * El MIME que devuelve `MediaRecorder` trae el códec pegado
 * (`audio/webm;codecs=opus`) y la lista blanca del servidor compara el string
 * completo, así que al subir se recorta hasta el `;`.
 */
const FORMATOS = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const;

const BITS_POR_SEGUNDO = 32_000;

export type EstadoGrabador = "INACTIVO" | "GRABANDO" | "PAUSADO" | "ERROR";

/**
 * Por qué no se puede grabar.
 *
 * Están separados porque la acción que resuelve cada uno es distinta, y
 * mostrarlos todos como «no diste permiso» manda a la persona a revisar un
 * permiso que ya había dado. En particular `SIN_CONTEXTO_SEGURO`: el navegador
 * ni siquiera expone `navigator.mediaDevices` fuera de HTTPS (o de localhost),
 * así que no hay permiso que conceder — hay que entrar por otra URL.
 */
export type MotivoSinGrabador =
  | "SIN_CONTEXTO_SEGURO"
  | "NO_SOPORTADO"
  | "SIN_PERMISO"
  | "SIN_MICROFONO"
  | "MICROFONO_OCUPADO"
  | "DESCONOCIDO";

export interface FalloGrabador {
  motivo: MotivoSinGrabador;
  /** Mensaje crudo del navegador, para los casos que no encajan en ninguno. */
  detalle: string | null;
}

/** Traduce el `DOMException` de `getUserMedia` a un motivo accionable. */
function motivoDeError(error: unknown): MotivoSinGrabador {
  const nombre = error instanceof DOMException ? error.name : "";
  switch (nombre) {
    // El usuario dijo que no, o una Permissions-Policy lo bloquea. Ojo con esto
    // último: la política de la página GANA sobre el permiso de la persona, así
    // que se ve igual que un rechazo aunque el permiso esté concedido (ver
    // `Permissions-Policy` en next.config.ts).
    case "NotAllowedError":
    case "SecurityError":
      return "SIN_PERMISO";
    case "NotFoundError":
    case "OverconstrainedError":
      return "SIN_MICROFONO";
    // Otro programa lo tiene tomado (una videollamada abierta, típicamente).
    case "NotReadableError":
    case "AbortError":
      return "MICROFONO_OCUPADO";
    default:
      return "DESCONOCIDO";
  }
}

export interface AudioGrabado {
  archivo: File;
  duracionSegundos: number;
}

/**
 * Grabador de audio del navegador, sobre `MediaRecorder`.
 *
 * Tres cosas que hace y no se ven:
 *
 *  - **Suelta el micrófono al terminar.** Sin detener las pistas del `stream`,
 *    el indicador de grabación del navegador queda encendido después de parar,
 *    que para quien está en una consulta parece que se lo sigue grabando.
 *  - **Pausa de verdad.** Es lo que evita tener que cortar y empezar otra
 *    grabación cada vez que se interrumpe la consulta: al reanudar sigue el
 *    mismo archivo, y la cuenta del tiempo descuenta lo que estuvo en pausa.
 *  - **Limpia si el componente se desmonta grabando**, para no dejar el
 *    micrófono abierto cuando alguien cierra el diálogo sin parar.
 */
export function useGrabadorAudio() {
  const [estado, setEstado] = useState<EstadoGrabador>("INACTIVO");
  const [fallo, setFallo] = useState<FalloGrabador | null>(null);
  const [segundos, setSegundos] = useState(0);

  const grabadorRef = useRef<MediaRecorder | null>(null);
  const trozosRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  // La duración se cuenta con el reloj y no con la cantidad de trozos: los
  // trozos llegan cuando el navegador quiere, y en pausa no llega ninguno.
  const inicioRef = useRef<number>(0);
  const acumuladoRef = useRef<number>(0);

  const soltarMicrofono = useCallback(() => {
    streamRef.current?.getTracks().forEach((pista) => pista.stop());
    streamRef.current = null;
  }, []);

  // Desmontar con el micrófono abierto es el caso de "cerré el diálogo sin
  // parar": el navegador seguiría mostrando que se está grabando.
  useEffect(() => soltarMicrofono, [soltarMicrofono]);

  // Cronómetro: solo corre grabando, y suma sobre lo acumulado antes de pausar.
  useEffect(() => {
    if (estado !== "GRABANDO") return;
    const id = setInterval(() => {
      setSegundos(
        Math.floor(
          (acumuladoRef.current + (Date.now() - inicioRef.current)) / 1000,
        ),
      );
    }, 250);
    return () => clearInterval(id);
  }, [estado]);

  const fallar = useCallback(
    (motivo: MotivoSinGrabador, detalle: string | null = null): void => {
      setFallo({ motivo, detalle });
      setEstado("ERROR");
    },
    [],
  );

  const comenzar = useCallback(async (): Promise<void> => {
    // Reintentar es volver a llamar acá: el fallo anterior se limpia solo, así
    // que conceder el permiso y apretar «Reintentar» alcanza. Antes el estado
    // de error era terminal y había que recargar la página, que es justo lo que
    // nadie hace en el medio de una consulta.
    setFallo(null);

    // Fuera de un contexto seguro el navegador NO expone `mediaDevices`. Se
    // comprueba antes de tocarlo: sin esto, el acceso lanzaba un TypeError que
    // el catch de abajo reportaba como «no diste permiso», mandando a revisar
    // un permiso que no tenía nada que ver.
    if (
      typeof window === "undefined" ||
      !window.isSecureContext ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      fallar("SIN_CONTEXTO_SEGURO");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      fallar("NO_SOPORTADO");
      return;
    }
    const formato = FORMATOS.find((f) => MediaRecorder.isTypeSupported(f));
    if (!formato) {
      fallar("NO_SOPORTADO");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Una consulta es voz en una habitación con ruido de fondo: sin esto
          // el audio sale con eco de ambiente y el reconocimiento empeora.
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (error) {
      fallar(
        motivoDeError(error),
        error instanceof Error ? error.message : null,
      );
      return;
    }

    const grabador = new MediaRecorder(stream, {
      mimeType: formato,
      audioBitsPerSecond: BITS_POR_SEGUNDO,
    });
    trozosRef.current = [];
    grabador.ondataavailable = (evento) => {
      if (evento.data.size > 0) trozosRef.current.push(evento.data);
    };
    // Un trozo por segundo: si la pestaña muere, lo grabado hasta ahí ya está
    // en memoria en vez de perderse entero.
    grabador.start(1000);

    grabadorRef.current = grabador;
    streamRef.current = stream;
    acumuladoRef.current = 0;
    inicioRef.current = Date.now();
    setSegundos(0);
    setEstado("GRABANDO");
  }, [fallar]);

  const pausar = useCallback((): void => {
    const grabador = grabadorRef.current;
    if (!grabador || grabador.state !== "recording") return;
    grabador.pause();
    acumuladoRef.current += Date.now() - inicioRef.current;
    setEstado("PAUSADO");
  }, []);

  const reanudar = useCallback((): void => {
    const grabador = grabadorRef.current;
    if (!grabador || grabador.state !== "paused") return;
    grabador.resume();
    inicioRef.current = Date.now();
    setEstado("GRABANDO");
  }, []);

  /** Corta y devuelve el archivo, o null si no llegó a grabarse nada. */
  const detener = useCallback((): Promise<AudioGrabado | null> => {
    const grabador = grabadorRef.current;
    if (!grabador || grabador.state === "inactive") {
      return Promise.resolve(null);
    }

    const transcurrido =
      acumuladoRef.current +
      (grabador.state === "recording" ? Date.now() - inicioRef.current : 0);

    return new Promise((resolver) => {
      grabador.onstop = () => {
        // El MIME sin el códec: la lista blanca del servidor compara el string
        // completo y `audio/webm;codecs=opus` no está en ella.
        const mime = (grabador.mimeType || "audio/webm").split(";")[0]!;
        const blob = new Blob(trozosRef.current, { type: mime });
        trozosRef.current = [];
        grabadorRef.current = null;
        soltarMicrofono();
        setEstado("INACTIVO");
        setSegundos(0);

        if (blob.size === 0) {
          resolver(null);
          return;
        }
        const sello = new Date().toISOString().replace(/[:.]/g, "-");
        resolver({
          archivo: new File([blob], `consulta-${sello}${extension(mime)}`, {
            type: mime,
          }),
          duracionSegundos: Math.round(transcurrido / 1000),
        });
      };
      grabador.stop();
    });
  }, [soltarMicrofono]);

  /** Corta y descarta lo grabado (el botón de cancelar). */
  const descartar = useCallback((): void => {
    const grabador = grabadorRef.current;
    if (grabador && grabador.state !== "inactive") {
      grabador.onstop = null;
      grabador.stop();
    }
    trozosRef.current = [];
    grabadorRef.current = null;
    soltarMicrofono();
    setEstado("INACTIVO");
    setSegundos(0);
  }, [soltarMicrofono]);

  return {
    estado,
    /** Por qué no se puede grabar, o null si no falló nada. */
    fallo,
    segundos,
    grabando: estado === "GRABANDO" || estado === "PAUSADO",
    comenzar,
    pausar,
    reanudar,
    detener,
    descartar,
  };
}

function extension(mime: string): string {
  if (mime.includes("mp4")) return ".m4a";
  if (mime.includes("ogg")) return ".ogg";
  if (mime.includes("mpeg")) return ".mp3";
  return ".webm";
}

/** "7:05" a partir de los segundos. */
export function formatearDuracion(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return `${minutos}:${String(resto).padStart(2, "0")}`;
}
