/**
 * Contenedor de inyección de dependencias (manual, sin librerías).
 *
 * Arma los servicios de aplicación a partir de los adaptadores y repositorios
 * de ./nucleo. El resto de la aplicación depende solo de interfaces y
 * servicios, nunca de las implementaciones.
 *
 * Todo se expone como GETTER PEREZOSO (`servicioPaciente()`, no
 * `servicioPaciente`). Antes eran constantes evaluadas al cargar el módulo, y
 * eso significaba que importar un solo servicio construía los 36 repositorios,
 * el cliente S3 y los adaptadores de IA — con el worker arrastrando los 27
 * servicios para usar dos, y el build de Next necesitando credenciales falsas.
 * Ahora cada pieza se construye la primera vez que se la pide (ver ./perezoso).
 *
 * IMPORTANTE: este archivo no debe importar nada de Next (lo consume también
 * el worker de trabajos en segundo plano).
 */

import { perezoso } from "./perezoso";
import * as nucleo from "./nucleo";

import { crearServicioPaciente } from "./modulos/pacientes";
import { crearServicioTurno } from "./modulos/turnos";
import { crearServicioWhatsapp } from "./modulos/whatsapp";
import { crearServicioRecordatorios } from "./modulos/recordatorios";
import { crearServicioArchivo } from "./modulos/archivos";
import { crearServicioEvaluacion } from "./modulos/evaluacion";
import { crearServicioDiario } from "./modulos/diario";
import { crearServicioReceta } from "./modulos/recetas";
import { crearServicioGrabaciones } from "./modulos/grabaciones";
import { crearServicioPlan } from "./modulos/planes";
import { crearServicioObjetivo } from "./modulos/objetivos";
import { crearServicioBiblioteca } from "./modulos/biblioteca";
import { crearServicioSeguimiento } from "./modulos/seguimiento";
import { crearServicioSecretaria } from "./modulos/secretaria";
import { crearServicioEstadisticas } from "./modulos/estadisticas";
import { crearServicioMensajeria } from "./modulos/mensajeria";
import { crearServicioNotificaciones } from "./modulos/notificaciones";
import { crearServicioConfiguracion } from "./modulos/configuracion";
import { crearServicioAxiomas } from "./modulos/axiomas";
import { crearServicioTracking } from "./modulos/tracking";
import { crearServicioMetricas } from "./modulos/metricas";
import { crearServicioSuperAdmin } from "./modulos/superadmin";
import { crearServicioIA } from "./modulos/ia";
import { crearServicioAutenticacion } from "./modulos/autenticacion";
import { crearServicioDeportivo } from "./modulos/deportivo";
import { crearServicioNutricion } from "./modulos/nutricion";
import { crearServicioCredenciales } from "./modulos/credenciales";

import { ServicioIntegraciones } from "@/aplicacion/servicios/ServicioIntegraciones";
import { ObtenerCuentaGoogle } from "@/aplicacion/casos-de-uso/integraciones/ObtenerCuentaGoogle";
import { GuardarConexionGoogle } from "@/aplicacion/casos-de-uso/integraciones/GuardarConexionGoogle";
import { DesconectarGoogle } from "@/aplicacion/casos-de-uso/integraciones/DesconectarGoogle";

import { ServicioAlimentosPropios } from "@/aplicacion/servicios/ServicioAlimentosPropios";
import { ImportarAlimentos } from "@/aplicacion/casos-de-uso/nutricion/ImportarAlimentos";
import { ObtenerEstadoAlimentosPropios } from "@/aplicacion/casos-de-uso/nutricion/ObtenerEstadoAlimentosPropios";
import { VaciarAlimentosPropios } from "@/aplicacion/casos-de-uso/nutricion/VaciarAlimentosPropios";

// --- Reexportes del núcleo que consume la presentación --------------------------
export { busEventos, proveedorGoogle, directorioWhatsapp } from "./nucleo";

/** El repositorio de usuario se expone para la configuración de Auth.js. */
export const repositorioUsuarioCompartido = nucleo.repositorioUsuario;

// --- Servicios de aplicación (armados por módulo) ---------------------------------

export const servicioPaciente = perezoso(() =>
  crearServicioPaciente({
    pacientes: nucleo.repositorioPaciente(),
    usuarios: nucleo.repositorioUsuario(),
    plantillas: nucleo.repositorioPlantillaEmail(),
    hasheador: nucleo.hasheador(),
    servicioEmail: nucleo.servicioEmail(),
    // El prefijo de país del consultorio define cómo se canoniza el teléfono
    // del paciente a E.164 al darlo de alta o editarlo.
    configuracion: nucleo.repositorioConfiguracion(),
    nombreProfesional: nucleo.NOMBRE_PROFESIONAL,
    historias: nucleo.repositorioHistoriaClinica(),
    camposHistoria: nucleo.repositorioCampoHistoriaClinica(),
    alertas: nucleo.repositorioAlertaAlimentaria(),
    antropometrias: nucleo.repositorioAntropometria(),
    laboratorios: nucleo.repositorioLaboratorio(),
    archivos: nucleo.repositorioArchivo(),
    interpretadorFicha: nucleo.interpretadorFichaPaciente(),
  }),
);

export const servicioWhatsapp = perezoso(() =>
  crearServicioWhatsapp({
    pacientes: nucleo.repositorioPaciente(),
    configuracion: nucleo.repositorioConfiguracion(),
    recordatorios: nucleo.repositorioRecordatorioWhatsapp(),
    mensajes: nucleo.repositorioMensajeWhatsapp(),
    usuarios: nucleo.repositorioUsuario(),
    proveedor: nucleo.proveedorWhatsapp(),
    bus: nucleo.busEventos(),
  }),
);

/**
 * Recordatorios de turno: la política de los tres medios (WhatsApp, email y
 * calendario), las plantillas propias y el envío —manual y automático— por
 * WhatsApp.
 */
export const servicioRecordatorios = perezoso(() =>
  crearServicioRecordatorios({
    turnos: nucleo.repositorioTurno(),
    pacientes: nucleo.repositorioPaciente(),
    configuracion: nucleo.repositorioConfiguracion(),
    plantillas: nucleo.repositorioPlantillaWhatsapp(),
    configRecordatorios: nucleo.repositorioConfiguracionRecordatorios(),
    recordatorios: nucleo.repositorioRecordatorioWhatsapp(),
    mensajes: nucleo.repositorioMensajeWhatsapp(),
    cuentas: nucleo.repositorioCuentaConectada(),
    proveedor: nucleo.proveedorWhatsapp(),
    reloj: nucleo.reloj(),
    plantillasEmail: nucleo.repositorioPlantillaEmail(),
    emailsEnviados: nucleo.repositorioEmailEnviado(),
    servicioEmail: nucleo.servicioEmail(),
    usuarios: nucleo.repositorioUsuario(),
    bus: nucleo.busEventos(),
    nombreProfesional: nucleo.NOMBRE_PROFESIONAL,
  }),
);

export const servicioTurno = perezoso(() =>
  crearServicioTurno({
    turnos: nucleo.repositorioTurno(),
    pacientes: nucleo.repositorioPaciente(),
    configuracion: nucleo.repositorioConfiguracion(),
    sincronizador: nucleo.sincronizadorCalendario(),
  }),
);

export const servicioArchivo = perezoso(() =>
  crearServicioArchivo({
    archivos: nucleo.repositorioArchivo(),
    recetas: nucleo.repositorioReceta(),
    materiales: nucleo.repositorioMaterial(),
    planes: nucleo.repositorioPlan(),
    almacenamiento: nucleo.almacenamiento(),
  }),
);

export const servicioEvaluacion = perezoso(() =>
  crearServicioEvaluacion({
    historias: nucleo.repositorioHistoriaClinica(),
    antropometrias: nucleo.repositorioAntropometria(),
    objetivosComposicion: nucleo.repositorioObjetivoComposicion(),
    plantillasAntropometricas: nucleo.repositorioPlantillaAntropometrica(),
    alertas: nucleo.repositorioAlertaAlimentaria(),
    laboratorios: nucleo.repositorioLaboratorio(),
    archivos: nucleo.repositorioArchivo(),
    pacientes: nucleo.repositorioPaciente(),
    almacenamiento: nucleo.almacenamiento(),
    interpretadorHistoriaClinica: nucleo.interpretadorHistoriaClinica(),
    camposHistoria: nucleo.repositorioCampoHistoriaClinica(),
  }),
);

export const servicioDiario = perezoso(() =>
  crearServicioDiario({
    registros: nucleo.repositorioRegistroDiario(),
    pacientes: nucleo.repositorioPaciente(),
    archivos: nucleo.repositorioArchivo(),
    almacenamiento: nucleo.almacenamiento(),
  }),
);

export const servicioReceta = perezoso(() =>
  crearServicioReceta({
    recetas: nucleo.repositorioReceta(),
    gruposReceta: nucleo.repositorioGrupoReceta(),
    pacientes: nucleo.repositorioPaciente(),
    archivos: nucleo.repositorioArchivo(),
    almacenamiento: nucleo.almacenamiento(),
  }),
);

export const servicioGrabaciones = perezoso(() =>
  crearServicioGrabaciones({
    grabaciones: nucleo.repositorioGrabacion(),
    turnos: nucleo.repositorioTurno(),
    pacientes: nucleo.repositorioPaciente(),
    archivos: nucleo.repositorioArchivo(),
    almacenamiento: nucleo.almacenamiento(),
    cola: nucleo.colaTrabajos(),
    transcriptor: nucleo.transcriptorAudio(),
    resumidor: nucleo.resumidorConsulta(),
  }),
);

export const servicioPlan = perezoso(() =>
  crearServicioPlan({
    planes: nucleo.repositorioPlan(),
    pacientes: nucleo.repositorioPaciente(),
    grupos: nucleo.repositorioGrupoPlan(),
  }),
);

/** Búsqueda de datos nutricionales para autocompletar ingredientes de recetas. */
export const servicioNutricion = perezoso(() =>
  crearServicioNutricion({
    proveedor: nucleo.proveedorNutricion(),
    credenciales: nucleo.repositorioCredenciales(),
  }),
);

/** Alimentos propios del profesional (su Excel), que desplazan a FatSecret. */
export const servicioAlimentosPropios = perezoso(
  () =>
    new ServicioAlimentosPropios(
      new ImportarAlimentos(nucleo.repositorioAlimentoPropio()),
      new ObtenerEstadoAlimentosPropios(nucleo.repositorioAlimentoPropio()),
      new VaciarAlimentosPropios(nucleo.repositorioAlimentoPropio()),
    ),
);

export const servicioObjetivo = perezoso(() =>
  crearServicioObjetivo({
    objetivos: nucleo.repositorioObjetivo(),
    pacientes: nucleo.repositorioPaciente(),
  }),
);

export const servicioBiblioteca = perezoso(() =>
  crearServicioBiblioteca({
    materiales: nucleo.repositorioMaterial(),
    pacientes: nucleo.repositorioPaciente(),
    archivos: nucleo.repositorioArchivo(),
    almacenamiento: nucleo.almacenamiento(),
  }),
);

export const servicioSeguimiento = perezoso(() =>
  crearServicioSeguimiento({
    suplementos: nucleo.repositorioSuplemento(),
    alertas: nucleo.repositorioAlertaSeguimiento(),
    pacientes: nucleo.repositorioPaciente(),
    registros: nucleo.repositorioRegistroDiario(),
    antropometrias: nucleo.repositorioAntropometria(),
    planes: nucleo.repositorioPlan(),
    turnos: nucleo.repositorioTurno(),
    usuarios: nucleo.repositorioUsuario(),
    reloj: nucleo.reloj(),
    bus: nucleo.busEventos(),
  }),
);

export const servicioSecretaria = perezoso(() =>
  crearServicioSecretaria({
    plantillas: nucleo.repositorioPlantillaEmail(),
    emails: nucleo.repositorioEmailEnviado(),
    servicioEmail: nucleo.servicioEmail(),
    reloj: nucleo.reloj(),
    nombreProfesional: nucleo.NOMBRE_PROFESIONAL,
  }),
);

export const servicioEstadisticas = perezoso(() =>
  crearServicioEstadisticas({
    estadisticas: nucleo.repositorioEstadisticas(),
  }),
);

export const servicioMensajeria = perezoso(() =>
  crearServicioMensajeria({
    mensajeria: nucleo.repositorioMensajeria(),
    usuarios: nucleo.repositorioUsuario(),
    bus: nucleo.busEventos(),
  }),
);

/** Centro de notificaciones: compone alertas, mensajería y correos (solo lectura). */
export const servicioNotificaciones = perezoso(() =>
  crearServicioNotificaciones({
    alertas: nucleo.repositorioAlertaSeguimiento(),
    mensajeria: nucleo.repositorioMensajeria(),
    emails: nucleo.repositorioEmailEnviado(),
  }),
);

export const servicioConfiguracion = perezoso(() =>
  crearServicioConfiguracion({
    configuracion: nucleo.repositorioConfiguracion(),
  }),
);

export const servicioAxiomas = perezoso(() =>
  crearServicioAxiomas({
    axiomas: nucleo.repositorioAxioma(),
  }),
);

/** Tracking del paciente: read-model compuesto (diario + plan + axiomas + antropometría). */
export const servicioTracking = perezoso(() =>
  crearServicioTracking({
    pacientes: nucleo.repositorioPaciente(),
    registros: nucleo.repositorioRegistroDiario(),
    planes: nucleo.repositorioPlan(),
    axiomas: nucleo.repositorioAxioma(),
    antropometrias: nucleo.repositorioAntropometria(),
    metricas: nucleo.repositorioMetrica(),
  }),
);

/** Métricas de dispositivo (wearables): importación, consulta y opt-in por día. */
export const servicioMetricas = perezoso(() =>
  crearServicioMetricas({ metricas: nucleo.repositorioMetrica() }),
);

/** Módulo deportivo: perfil del deportista + calendario de competencias. */
export const servicioDeportivo = perezoso(() =>
  crearServicioDeportivo({
    perfiles: nucleo.repositorioPerfilDeportivo(),
    competencias: nucleo.repositorioCompetencia(),
    pacientes: nucleo.repositorioPaciente(),
  }),
);

/** Credenciales de integración del profesional (clave de Claude / FatSecret). */
export const servicioCredenciales = perezoso(() =>
  crearServicioCredenciales({
    credenciales: nucleo.repositorioCredenciales(),
  }),
);

/** SuperAdmin: alta/gestión de cuentas de nutricionista (cada una un inquilino). */
export const servicioSuperAdmin = perezoso(() =>
  crearServicioSuperAdmin({
    usuarios: nucleo.repositorioUsuario(),
    hasheador: nucleo.hasheador(),
    provisionador: nucleo.provisionadorNutricionista(),
    nutricionistas: nucleo.repositorioNutricionista(),
  }),
);

/** Integraciones (Google). Los casos de uso son null si no está configurada. */
export const servicioIntegraciones = perezoso(() => {
  const cuentas = nucleo.repositorioCuentaConectada();
  return new ServicioIntegraciones(
    nucleo.hayGoogle(),
    cuentas ? new ObtenerCuentaGoogle(cuentas) : null,
    cuentas ? new GuardarConexionGoogle(cuentas) : null,
    cuentas ? new DesconectarGoogle(cuentas) : null,
  );
});

export const servicioIA = perezoso(() =>
  crearServicioIA({
    pacientes: nucleo.repositorioPaciente(),
    objetivos: nucleo.repositorioObjetivo(),
    planes: nucleo.repositorioPlan(),
    recetas: nucleo.repositorioReceta(),
    turnos: nucleo.repositorioTurno(),
    alertas: nucleo.repositorioAlertaAlimentaria(),
    axiomas: nucleo.repositorioAxioma(),
    historial: nucleo.repositorioHistorialIA(),
    perfilesDeportivos: nucleo.repositorioPerfilDeportivo(),
    competencias: nucleo.repositorioCompetencia(),
    asistente: nucleo.asistenteNutricional(),
    asistenteAnalitico: nucleo.asistenteAnalitico(),
    analisisComida: nucleo.analisisComidaIA(),
    analisisPredictivo: nucleo.analisisPredictivo(),
    retroalimentacion: nucleo.repositorioRetroalimentacion(),
    conversaciones: nucleo.repositorioConversacionIA(),
    reloj: nucleo.reloj(),
    estado: {
      asistenteActivo: () => nucleo.tieneIA(),
      insightsActivo: nucleo.hayML(),
    },
  }),
);

/**
 * Autenticación: recuperación de contraseña (endpoints públicos, alcance
 * global). El enlace del email usa la URL pública de la app.
 */
export const servicioAutenticacion = perezoso(() =>
  crearServicioAutenticacion({
    usuarios: nucleo.repositorioUsuario(),
    tokens: nucleo.repositorioTokenRecuperacion(),
    generador: nucleo.generadorTokens(),
    hasheador: nucleo.hasheador(),
    servicioEmail: nucleo.servicioEmail(),
    reloj: nucleo.reloj(),
    baseUrl: nucleo.urlApp(),
    nombreProfesional: nucleo.NOMBRE_PROFESIONAL,
  }),
);
