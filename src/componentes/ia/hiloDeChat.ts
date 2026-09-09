"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/** Un turno del chat, como se pinta en el hilo. */
export interface TurnoChat {
  rol: "USUARIO" | "ASISTENTE";
  contenido: string;
}

/**
 * El hilo de un chat con el asistente: lo guardado más lo recién escrito, y el
 * scroll al fondo.
 *
 * Lo usan los dos chats de la app —el analítico del profesional y el del
 * paciente— y vive acá porque las dos partes difíciles son las mismas en los
 * dos, y las dos fallan de forma silenciosa:
 *
 * **La cola.** La pregunta y la respuesta tienen que aparecer al instante, sin
 * esperar a que la query las traiga de vuelta. `desde` es lo que evita el
 * duplicado: guarda cuántos turnos había cuando se empezó a escribir, y a
 * medida que la query alcanza a la cola se descarta de la cola exactamente lo
 * que ya llegó guardado. Comparar textos en vez de contar rompería en cuanto
 * alguien pregunte dos veces lo mismo.
 *
 * **El scroll.** Baja moviendo SOLO el `scrollTop` del contenedor. Un
 * `scrollIntoView()` arrastra a todos los contenedores con scroll que lo
 * contienen —incluida la página—, así que cada mensaje se llevaba la pantalla
 * entera al fondo. Al cambiar de chat baja sin animación: recorrer un historial
 * largo con animación se ve como un tirón y no aporta nada.
 */
export function useHiloDeChat({
  guardados,
  conversacionId,
  pendiente,
}: {
  /** Los turnos que ya devolvió el servidor, del más viejo al más nuevo. */
  guardados: TurnoChat[];
  /** Chat abierto; al cambiar, la cola se vacía y el scroll no se anima. */
  conversacionId: string | null;
  /** Si hay una respuesta en curso (para bajar cuando aparece el «pensando»). */
  pendiente: boolean;
}): {
  turnos: TurnoChat[];
  hiloRef: RefObject<HTMLDivElement | null>;
  encolarPregunta: (texto: string) => void;
  encolarRespuesta: (texto: string) => void;
  descartarUltima: () => void;
  vaciar: () => void;
} {
  const [cola, setCola] = useState<{ desde: number; turnos: TurnoChat[] }>({
    desde: 0,
    turnos: [],
  });
  const hiloRef = useRef<HTMLDivElement>(null);
  const ultimaBajada = useRef<string | null>(null);

  const yaLlegaron = Math.max(0, guardados.length - cola.desde);
  const turnos = [...guardados, ...cola.turnos.slice(yaLlegaron)];

  useEffect(() => {
    const hilo = hiloRef.current;
    if (!hilo) return;
    const cambioDeChat = ultimaBajada.current !== conversacionId;
    ultimaBajada.current = conversacionId;
    hilo.scrollTo({
      top: hilo.scrollHeight,
      behavior: cambioDeChat ? "auto" : "smooth",
    });
  }, [turnos.length, pendiente, conversacionId]);

  return {
    turnos,
    hiloRef,
    encolarPregunta: (texto) =>
      setCola((previa) => ({
        desde: previa.turnos.length === 0 ? guardados.length : previa.desde,
        turnos: [...previa.turnos, { rol: "USUARIO", contenido: texto }],
      })),
    encolarRespuesta: (texto) =>
      setCola((previa) => ({
        ...previa,
        turnos: [...previa.turnos, { rol: "ASISTENTE", contenido: texto }],
      })),
    // La pregunta ya quedó guardada en el servidor, pero acá se saca para que
    // se pueda reescribir sin verla duplicada.
    descartarUltima: () =>
      setCola((previa) => ({
        ...previa,
        turnos: previa.turnos.slice(0, -1),
      })),
    // La cola es del chat que se deja: sin vaciarla, sus turnos se colarían al
    // final del que se abre.
    vaciar: () => setCola({ desde: 0, turnos: [] }),
  };
}
