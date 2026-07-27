import { crearRouter, protegidoProcedimiento } from "../trpc";
import type { EventoTiempoReal } from "@/dominio/servicios/IBusEventos";

/**
 * Router de tiempo real: expone una subscription tRPC (servida por SSE) con
 * el flujo de eventos dirigidos al usuario de la sesión. El cliente reacciona
 * invalidando queries y mostrando avisos (ver useTiempoReal).
 */
export const routerTiempoReal = crearRouter({
  suscribirse: protegidoProcedimiento.subscription(async function* ({ ctx, signal }) {
    // `signal` se aborta cuando el cliente cierra la conexión SSE.
    for await (const evento of ctx.busEventos.suscribir(ctx.usuario.id, signal!)) {
      yield evento satisfies EventoTiempoReal;
    }
  }),
});
