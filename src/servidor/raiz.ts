import { crearRouter, crearCallerFactory } from "./trpc";
import { routerPacientes } from "./routers/pacientes";
import { routerTurnos } from "./routers/turnos";
import { routerDietas } from "./routers/dietas";

/**
 * Router raíz: combina todos los sub-routers de la aplicación.
 * Su tipo (RouterApp) es el que consume el cliente tRPC para tener
 * type-safety de extremo a extremo.
 */
export const routerApp = crearRouter({
  pacientes: routerPacientes,
  turnos: routerTurnos,
  dietas: routerDietas,
});

/** Tipo del router raíz, exportado para el cliente. */
export type RouterApp = typeof routerApp;

/** Permite invocar procedimientos desde el servidor (RSC, seeds, tests). */
export const crearCaller = crearCallerFactory(routerApp);
