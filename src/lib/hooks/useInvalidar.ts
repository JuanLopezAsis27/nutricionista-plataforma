"use client";

import { trpc } from "@/lib/trpc";

/**
 * Invalidación de la caché tras una mutación: TODO, a propósito.
 *
 * Cada hook invalidaba solo su propio router (`utils.turnos.invalidate()`), y
 * eso es correcto únicamente si los datos de un router no aparecen en otro.
 * En esta app aparecen todo el tiempo, porque los read models están armados
 * para la pantalla y no para la tabla:
 *
 *   - Recordatorios lista TURNOS (borrar un turno dejaba el aviso colgado ahí
 *     hasta recargar la página — el bug que motivó esto).
 *   - La ficha del paciente muestra sus turnos, planes, recetas y objetivos.
 *   - El centro de notificaciones compone alertas, mensajes y correos.
 *   - Las estadísticas suman turnos cobrados.
 *
 * Mantener a mano la lista de "qué routers toca cada mutación" es una tarea
 * que se rompe sola: cada read model nuevo agrega dependencias que hay que
 * recordar, y olvidarse no da error —da datos viejos en pantalla, que es
 * mucho peor porque nadie lo nota hasta que alguien decide sobre ellos—.
 *
 * El costo real es bajo: React Query solo REFETCHEA las queries activas (las
 * montadas en la pantalla actual, que son un puñado); el resto simplemente
 * queda marcada como vieja y se vuelve a pedir recién si se la usa.
 *
 * Si alguna pantalla llegara a sufrirlo, la salida NO es volver a invalidar
 * por router: es que esa query concreta se excluya, dejando el default seguro.
 */
export function useInvalidar(): () => void {
  const utils = trpc.useUtils();
  return () => {
    void utils.invalidate();
  };
}
