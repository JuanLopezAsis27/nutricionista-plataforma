/**
 * Contenedor de inyección de dependencias (manual, sin librerías).
 *
 * Este es el ÚNICO lugar donde se instancian las implementaciones concretas
 * (Prisma, bucket S3, bcrypt) y se "enchufan" en los casos de uso y
 * servicios. El resto de la aplicación depende solo de interfaces y
 * servicios, nunca de las implementaciones.
 *
 * El armado de cada módulo (casos de uso → servicio) vive en ./modulos/*;
 * acá solo se crean los adaptadores compartidos y se ensambla.
 *
 * IMPORTANTE: este archivo no debe importar nada de Next (lo consume también
 * el worker de trabajos en segundo plano).
 */

import { PrismaClienteSingleton } from "@/infraestructura/repositorios/PrismaClienteSingleton";
import { PrismaRepositorioPaciente } from "@/infraestructura/repositorios/PrismaRepositorioPaciente";
import { PrismaRepositorioTurno } from "@/infraestructura/repositorios/PrismaRepositorioTurno";
import { PrismaRepositorioUsuario } from "@/infraestructura/repositorios/PrismaRepositorioUsuario";
import { PrismaRepositorioArchivo } from "@/infraestructura/repositorios/PrismaRepositorioArchivo";
import { PrismaRepositorioHistoriaClinica } from "@/infraestructura/repositorios/PrismaRepositorioHistoriaClinica";
import { PrismaRepositorioAntropometria } from "@/infraestructura/repositorios/PrismaRepositorioAntropometria";
import { PrismaRepositorioAlertaAlimentaria } from "@/infraestructura/repositorios/PrismaRepositorioAlertaAlimentaria";
import { PrismaRepositorioLaboratorio } from "@/infraestructura/repositorios/PrismaRepositorioLaboratorio";
import { PrismaRepositorioRegistroDiario } from "@/infraestructura/repositorios/PrismaRepositorioRegistroDiario";
import { PrismaRepositorioReceta } from "@/infraestructura/repositorios/PrismaRepositorioReceta";
import { PrismaRepositorioPlan } from "@/infraestructura/repositorios/PrismaRepositorioPlan";
import { PrismaRepositorioObjetivo } from "@/infraestructura/repositorios/PrismaRepositorioObjetivo";
import { PrismaRepositorioMaterial } from "@/infraestructura/repositorios/PrismaRepositorioMaterial";
import { PrismaRepositorioSuplemento } from "@/infraestructura/repositorios/PrismaRepositorioSuplemento";
import { PrismaRepositorioAlertaSeguimiento } from "@/infraestructura/repositorios/PrismaRepositorioAlertaSeguimiento";
import { PrismaRepositorioPlantillaEmail } from "@/infraestructura/repositorios/PrismaRepositorioPlantillaEmail";
import { PrismaRepositorioEmailEnviado } from "@/infraestructura/repositorios/PrismaRepositorioEmailEnviado";
import { PrismaRepositorioEstadisticas } from "@/infraestructura/repositorios/PrismaRepositorioEstadisticas";
import { PrismaRepositorioMensajeria } from "@/infraestructura/repositorios/PrismaRepositorioMensajeria";
import { PrismaRepositorioHistorialIA } from "@/infraestructura/repositorios/PrismaRepositorioHistorialIA";
import { PrismaRepositorioConfiguracion } from "@/infraestructura/repositorios/PrismaRepositorioConfiguracion";
import { PrismaRepositorioAxioma } from "@/infraestructura/repositorios/PrismaRepositorioAxioma";
import { AsistenteNutricionalStub } from "@/infraestructura/ia/AsistenteNutricionalStub";
import { AnalisisComidaIAStub } from "@/infraestructura/ia/AnalisisComidaIAStub";
import { AnalisisPredictivoStub } from "@/infraestructura/ia/AnalisisPredictivoStub";
import { BcryptHasheador } from "@/infraestructura/seguridad/BcryptHasheador";
import { AlmacenamientoMinIO } from "@/infraestructura/almacenamiento/AlmacenamientoMinIO";
import { RelojSistema } from "@/infraestructura/fecha/RelojSistema";
import { NodemailerServicioEmail } from "@/infraestructura/email/NodemailerServicioEmail";
import { BusEventosPostgres } from "@/infraestructura/tiempo-real/BusEventosPostgres";

import { crearServicioPaciente } from "./modulos/pacientes";
import { crearServicioTurno } from "./modulos/turnos";
import { crearServicioArchivo } from "./modulos/archivos";
import { crearServicioEvaluacion } from "./modulos/evaluacion";
import { crearServicioDiario } from "./modulos/diario";
import { crearServicioReceta } from "./modulos/recetas";
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
import { crearServicioSuperAdmin } from "./modulos/superadmin";
import { crearServicioIA } from "./modulos/ia";
import { ProvisionadorNutricionista } from "@/infraestructura/aprovisionamiento/ProvisionadorNutricionista";

// --- 1. Adaptadores compartidos ------------------------------------------------
const prisma = PrismaClienteSingleton.obtenerInstancia();

const repositorioPaciente = new PrismaRepositorioPaciente(prisma);
const repositorioTurno = new PrismaRepositorioTurno(prisma);
const repositorioUsuario = new PrismaRepositorioUsuario(prisma);
const repositorioArchivo = new PrismaRepositorioArchivo(prisma);
const repositorioHistoriaClinica = new PrismaRepositorioHistoriaClinica(prisma);
const repositorioAntropometria = new PrismaRepositorioAntropometria(prisma);
const repositorioAlertaAlimentaria = new PrismaRepositorioAlertaAlimentaria(prisma);
const repositorioLaboratorio = new PrismaRepositorioLaboratorio(prisma);
const repositorioRegistroDiario = new PrismaRepositorioRegistroDiario(prisma);
const repositorioReceta = new PrismaRepositorioReceta(prisma);
const repositorioPlan = new PrismaRepositorioPlan(prisma);
const repositorioObjetivo = new PrismaRepositorioObjetivo(prisma);
const repositorioMaterial = new PrismaRepositorioMaterial(prisma);
const repositorioSuplemento = new PrismaRepositorioSuplemento(prisma);
const repositorioAlertaSeguimiento = new PrismaRepositorioAlertaSeguimiento(prisma);
const repositorioPlantillaEmail = new PrismaRepositorioPlantillaEmail(prisma);
const repositorioEmailEnviado = new PrismaRepositorioEmailEnviado(prisma);
const repositorioEstadisticas = new PrismaRepositorioEstadisticas(prisma);
const repositorioMensajeria = new PrismaRepositorioMensajeria(prisma);
const repositorioHistorialIA = new PrismaRepositorioHistorialIA(prisma);
const repositorioConfiguracion = new PrismaRepositorioConfiguracion(prisma);
const repositorioAxioma = new PrismaRepositorioAxioma(prisma);

// Adaptadores de IA: hoy stubs; a futuro, adaptadores Claude (solo se cambia acá).
const asistenteNutricional = new AsistenteNutricionalStub();
const analisisComidaIA = new AnalisisComidaIAStub();
const analisisPredictivo = new AnalisisPredictivoStub();

const hasheador = new BcryptHasheador();
const almacenamiento = new AlmacenamientoMinIO();
const reloj = new RelojSistema();
const servicioEmail = new NodemailerServicioEmail();

// Bus de eventos en tiempo real (Postgres LISTEN/NOTIFY). Lo usan los
// servicios (publicar) y la subscription tRPC (suscribir); el worker solo
// publica desde su propio proceso.
export const busEventos = new BusEventosPostgres();

/** Nombre del profesional para membretes y firmas de emails. */
const NOMBRE_PROFESIONAL = process.env.NOMBRE_PROFESIONAL ?? "Lic. López Asis Nicolás";

// --- 2. Servicios de aplicación (armados por módulo) ---------------------------
export const servicioPaciente = crearServicioPaciente({
  pacientes: repositorioPaciente,
  usuarios: repositorioUsuario,
  plantillas: repositorioPlantillaEmail,
  hasheador,
  servicioEmail,
  nombreProfesional: NOMBRE_PROFESIONAL,
});

export const servicioTurno = crearServicioTurno({
  turnos: repositorioTurno,
  pacientes: repositorioPaciente,
});

export const servicioArchivo = crearServicioArchivo({
  archivos: repositorioArchivo,
  recetas: repositorioReceta,
  materiales: repositorioMaterial,
  almacenamiento,
});

export const servicioEvaluacion = crearServicioEvaluacion({
  historias: repositorioHistoriaClinica,
  antropometrias: repositorioAntropometria,
  alertas: repositorioAlertaAlimentaria,
  laboratorios: repositorioLaboratorio,
  archivos: repositorioArchivo,
  pacientes: repositorioPaciente,
  almacenamiento,
});

export const servicioDiario = crearServicioDiario({
  registros: repositorioRegistroDiario,
  pacientes: repositorioPaciente,
  archivos: repositorioArchivo,
  almacenamiento,
});

export const servicioReceta = crearServicioReceta({
  recetas: repositorioReceta,
  pacientes: repositorioPaciente,
  archivos: repositorioArchivo,
  almacenamiento,
});

export const servicioPlan = crearServicioPlan({
  planes: repositorioPlan,
  pacientes: repositorioPaciente,
});

export const servicioObjetivo = crearServicioObjetivo({
  objetivos: repositorioObjetivo,
  pacientes: repositorioPaciente,
});

export const servicioBiblioteca = crearServicioBiblioteca({
  materiales: repositorioMaterial,
  pacientes: repositorioPaciente,
  archivos: repositorioArchivo,
  almacenamiento,
});

export const servicioSeguimiento = crearServicioSeguimiento({
  suplementos: repositorioSuplemento,
  alertas: repositorioAlertaSeguimiento,
  pacientes: repositorioPaciente,
  registros: repositorioRegistroDiario,
  antropometrias: repositorioAntropometria,
  planes: repositorioPlan,
  turnos: repositorioTurno,
  usuarios: repositorioUsuario,
  reloj,
  bus: busEventos,
});

export const servicioSecretaria = crearServicioSecretaria({
  plantillas: repositorioPlantillaEmail,
  emails: repositorioEmailEnviado,
  turnos: repositorioTurno,
  pacientes: repositorioPaciente,
  usuarios: repositorioUsuario,
  servicioEmail,
  reloj,
  bus: busEventos,
  nombreProfesional: NOMBRE_PROFESIONAL,
});

export const servicioEstadisticas = crearServicioEstadisticas({
  estadisticas: repositorioEstadisticas,
});

export const servicioMensajeria = crearServicioMensajeria({
  mensajeria: repositorioMensajeria,
  usuarios: repositorioUsuario,
  bus: busEventos,
});

// Centro de notificaciones: compone alertas, mensajería y correos (solo lectura).
export const servicioNotificaciones = crearServicioNotificaciones({
  alertas: repositorioAlertaSeguimiento,
  mensajeria: repositorioMensajeria,
  emails: repositorioEmailEnviado,
});

export const servicioConfiguracion = crearServicioConfiguracion({
  configuracion: repositorioConfiguracion,
});

export const servicioAxiomas = crearServicioAxiomas({
  axiomas: repositorioAxioma,
});

// Tracking del paciente: read-model compuesto (diario + plan + axiomas + antropometría).
export const servicioTracking = crearServicioTracking({
  pacientes: repositorioPaciente,
  registros: repositorioRegistroDiario,
  planes: repositorioPlan,
  axiomas: repositorioAxioma,
  antropometrias: repositorioAntropometria,
});

// SuperAdmin: alta/gestión de cuentas de nutricionista (cada una un inquilino).
const provisionadorNutricionista = new ProvisionadorNutricionista(
  repositorioConfiguracion,
  repositorioPlantillaEmail,
  repositorioAxioma,
);
export const servicioSuperAdmin = crearServicioSuperAdmin({
  usuarios: repositorioUsuario,
  hasheador,
  provisionador: provisionadorNutricionista,
});

export const servicioIA = crearServicioIA({
  pacientes: repositorioPaciente,
  objetivos: repositorioObjetivo,
  planes: repositorioPlan,
  historial: repositorioHistorialIA,
  asistente: asistenteNutricional,
  analisisComida: analisisComidaIA,
  analisisPredictivo,
});

// El repositorio de usuario se expone para la configuración de Auth.js.
export const repositorioUsuarioCompartido = repositorioUsuario;

// El reloj se expone para casos de uso futuros que razonan sobre el tiempo.
export const relojCompartido = reloj;

/** Agrupación opcional para inyectar todo el contenedor en el contexto tRPC. */
export const contenedor = {
  servicioPaciente,
  servicioTurno,
  servicioArchivo,
  servicioEvaluacion,
  servicioDiario,
  servicioReceta,
  servicioPlan,
  servicioObjetivo,
  servicioBiblioteca,
  servicioSeguimiento,
  servicioSecretaria,
  servicioEstadisticas,
  servicioMensajeria,
  servicioNotificaciones,
  servicioConfiguracion,
  servicioAxiomas,
  servicioTracking,
  servicioSuperAdmin,
  servicioIA,
  repositorioUsuario,
} as const;

export type Contenedor = typeof contenedor;
