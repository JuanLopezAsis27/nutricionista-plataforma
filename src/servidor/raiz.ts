import { crearRouter, crearCallerFactory } from "./trpc";
import { routerPacientes } from "./routers/pacientes";
import { routerTurnos } from "./routers/turnos";
import { routerEvaluacion } from "./routers/evaluacion";
import { routerArchivos } from "./routers/archivos";
import { routerDiario } from "./routers/diario";
import { routerRecetas } from "./routers/recetas";
import { routerPlanes } from "./routers/planes";
import { routerObjetivos } from "./routers/objetivos";
import { routerBiblioteca } from "./routers/biblioteca";
import { routerSeguimiento } from "./routers/seguimiento";

/**
 * Router raíz: combina todos los sub-routers de la aplicación.
 * Su tipo (RouterApp) es el que consume el cliente tRPC para tener
 * type-safety de extremo a extremo.
 */
export const routerApp = crearRouter({
  pacientes: routerPacientes,
  turnos: routerTurnos,
  evaluacion: routerEvaluacion,
  archivos: routerArchivos,
  diario: routerDiario,
  recetas: routerRecetas,
  planes: routerPlanes,
  objetivos: routerObjetivos,
  biblioteca: routerBiblioteca,
  seguimiento: routerSeguimiento,
});

/** Tipo del router raíz, exportado para el cliente. */
export type RouterApp = typeof routerApp;

/** Permite invocar procedimientos desde el servidor (RSC, seeds, tests). */
export const crearCaller = crearCallerFactory(routerApp);
