import { crearRouter, crearCallerFactory } from "./trpc";
import { routerPacientes } from "./routers/pacientes";
import { routerTurnos } from "./routers/turnos";
import { routerEvaluacion } from "./routers/evaluacion";
import { routerArchivos } from "./routers/archivos";
import { routerDiario } from "./routers/diario";
import { routerRecetas } from "./routers/recetas";
import { routerGrabaciones } from "./routers/grabaciones";
import { routerPlanes } from "./routers/planes";
import { routerNutricion } from "./routers/nutricion";
import { routerObjetivos } from "./routers/objetivos";
import { routerBiblioteca } from "./routers/biblioteca";
import { routerSeguimiento } from "./routers/seguimiento";
import { routerSecretaria } from "./routers/secretaria";
import { routerEstadisticas } from "./routers/estadisticas";
import { routerTiempoReal } from "./routers/tiempoReal";
import { routerMensajeria } from "./routers/mensajeria";
import { routerNotificaciones } from "./routers/notificaciones";
import { routerConfiguracion } from "./routers/configuracion";
import { routerAxiomas } from "./routers/axiomas";
import { routerTracking } from "./routers/tracking";
import { routerMetricas } from "./routers/metricas";
import { routerCredenciales } from "./routers/credenciales";
import { routerSuperAdmin } from "./routers/superadmin";
import { routerIntegraciones } from "./routers/integraciones";
import { routerIA } from "./routers/ia";
import { routerAutenticacion } from "./routers/autenticacion";
import { routerDeportivo } from "./routers/deportivo";
import { routerWhatsapp } from "./routers/whatsapp";
import { routerRecordatorios } from "./routers/recordatorios";

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
  grabaciones: routerGrabaciones,
  planes: routerPlanes,
  nutricion: routerNutricion,
  objetivos: routerObjetivos,
  biblioteca: routerBiblioteca,
  seguimiento: routerSeguimiento,
  secretaria: routerSecretaria,
  estadisticas: routerEstadisticas,
  tiempoReal: routerTiempoReal,
  mensajeria: routerMensajeria,
  notificaciones: routerNotificaciones,
  configuracion: routerConfiguracion,
  axiomas: routerAxiomas,
  tracking: routerTracking,
  metricas: routerMetricas,
  credenciales: routerCredenciales,
  superadmin: routerSuperAdmin,
  integraciones: routerIntegraciones,
  ia: routerIA,
  autenticacion: routerAutenticacion,
  deportivo: routerDeportivo,
  whatsapp: routerWhatsapp,
  recordatorios: routerRecordatorios,
});

/** Tipo del router raíz, exportado para el cliente. */
export type RouterApp = typeof routerApp;

/** Permite invocar procedimientos desde el servidor (RSC, seeds, tests). */
export const crearCaller = crearCallerFactory(routerApp);
