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
import { PrismaRepositorioMetricaDispositivo } from "@/infraestructura/repositorios/PrismaRepositorioMetricaDispositivo";
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
import { crearServicioMetricas } from "./modulos/metricas";
import { crearServicioSuperAdmin } from "./modulos/superadmin";
import { crearServicioIA } from "./modulos/ia";
import { ProvisionadorNutricionista } from "@/infraestructura/aprovisionamiento/ProvisionadorNutricionista";
// Integraciones (Google) — F10.
import type { IProveedorGoogle } from "@/dominio/servicios/IProveedorGoogle";
import type { ISincronizadorCalendario } from "@/dominio/servicios/ISincronizadorCalendario";
import type { ICuentaConectadaRepositorio } from "@/dominio/repositorios/ICuentaConectadaRepositorio";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import { obtenerConfigGoogle } from "@/infraestructura/integraciones/configGoogle";
import { ProveedorGoogle } from "@/infraestructura/integraciones/ProveedorGoogle";
import { CifradorTokens } from "@/infraestructura/seguridad/CifradorTokens";
import { PrismaRepositorioCuentaConectada } from "@/infraestructura/repositorios/PrismaRepositorioCuentaConectada";
import { PrismaRepositorioSincronizacionTurno } from "@/infraestructura/repositorios/PrismaRepositorioSincronizacionTurno";
import { SincronizadorCalendarioGoogle } from "@/infraestructura/integraciones/SincronizadorCalendarioGoogle";
import { SincronizadorNulo } from "@/infraestructura/integraciones/SincronizadorNulo";
import { ServicioEmailConGoogle } from "@/infraestructura/integraciones/ServicioEmailConGoogle";
import { ObtenerCuentaGoogle } from "@/dominio/casos-de-uso/integraciones/ObtenerCuentaGoogle";
import { GuardarConexionGoogle } from "@/dominio/casos-de-uso/integraciones/GuardarConexionGoogle";
import { DesconectarGoogle } from "@/dominio/casos-de-uso/integraciones/DesconectarGoogle";
import { ServicioIntegraciones } from "@/aplicacion/servicios/ServicioIntegraciones";
// ML — F11.
import { obtenerConfigML } from "@/infraestructura/ml/configML";
import { ClienteML } from "@/infraestructura/ml/clienteML";
import { AnalisisPredictivoHTTP } from "@/infraestructura/ml/AnalisisPredictivoHTTP";
import { AnalisisComidaIAHTTP } from "@/infraestructura/ml/AnalisisComidaIAHTTP";
// Adaptadores Claude (asistente + visión de comida) — F13/F15.
import { AsistenteNutricionalClaude } from "@/infraestructura/ia/AsistenteNutricionalClaude";
import { AsistenteAnaliticoClaude } from "@/infraestructura/ia/AsistenteAnaliticoClaude";
import { AsistenteAnaliticoStub } from "@/infraestructura/ia/AsistenteAnaliticoStub";
import { AnalisisComidaIAClaude } from "@/infraestructura/ia/AnalisisComidaIAClaude";
import { ResolvedorConfigIA } from "@/infraestructura/ia/ResolvedorConfigIA";
import { TraductorIngredientesIA } from "@/infraestructura/ia/TraductorIngredientesIA";
import type { IAnalisisComidaIA } from "@/dominio/servicios/IAnalisisComidaIA";
// Datos nutricionales de ingredientes (F12/F15): FatSecret o Open Food Facts.
import { obtenerConfigNutricion } from "@/infraestructura/nutricion/configNutricion";
import { ProveedorOpenFoodFacts } from "@/infraestructura/nutricion/ProveedorOpenFoodFacts";
import { ProveedorNutricionNulo } from "@/infraestructura/nutricion/ProveedorNutricionNulo";
import { obtenerConfigFatSecret } from "@/infraestructura/nutricion/configFatSecret";
import { ClienteFatSecret } from "@/infraestructura/nutricion/ClienteFatSecret";
import { ProveedorNutricionApp } from "@/infraestructura/nutricion/ProveedorNutricionApp";
import { obtenerConfigNutricionServicio } from "@/infraestructura/nutricion/configNutricionServicio";
import { ProveedorNutricionHTTP } from "@/infraestructura/nutricion/ProveedorNutricionHTTP";
import { ProveedorNutricionPropio } from "@/infraestructura/nutricion/ProveedorNutricionPropio";
import { ProveedorNutricionDespachador } from "@/infraestructura/nutricion/ProveedorNutricionDespachador";
import { PrismaRepositorioAlimentoPropio } from "@/infraestructura/repositorios/PrismaRepositorioAlimentoPropio";
import { PrismaRepositorioRetroalimentacionInsight } from "@/infraestructura/repositorios/PrismaRepositorioRetroalimentacionInsight";
import { ServicioAlimentosPropios } from "@/aplicacion/servicios/ServicioAlimentosPropios";
import { ImportarAlimentos } from "@/dominio/casos-de-uso/nutricion/ImportarAlimentos";
import { ObtenerEstadoAlimentosPropios } from "@/dominio/casos-de-uso/nutricion/ObtenerEstadoAlimentosPropios";
import { VaciarAlimentosPropios } from "@/dominio/casos-de-uso/nutricion/VaciarAlimentosPropios";
import type { IProveedorDatosNutricionales } from "@/dominio/servicios/IProveedorDatosNutricionales";
import { crearServicioNutricion } from "./modulos/nutricion";
// Credenciales de integración por profesional — F15.
import { PrismaRepositorioCredenciales } from "@/infraestructura/repositorios/PrismaRepositorioCredenciales";
import { crearServicioCredenciales } from "./modulos/credenciales";

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
const repositorioMetrica = new PrismaRepositorioMetricaDispositivo(prisma);

// ML (F11): si hay microservicio configurado (ML_SERVICE_URL), se usa el
// adaptador HTTP con FALLBACK al stub; si no, el stub directo. La UI no cambia.
const configML = obtenerConfigML();
const clienteML = configML ? new ClienteML(configML) : null;

const hasheador = new BcryptHasheador();
const almacenamiento = new AlmacenamientoMinIO();
const reloj = new RelojSistema();

// Credenciales por profesional (F15): cifrador (solo si hay TOKENS_SECRET),
// repo cifrado y resolver de Claude (clave del inquilino → entorno → null),
// resuelto POR REQUEST. Así el profesional carga su clave desde la app.
const cifradorCredenciales = process.env.TOKENS_SECRET ? new CifradorTokens() : null;
export const repositorioCredenciales = new PrismaRepositorioCredenciales(
  prisma,
  cifradorCredenciales,
);
const resolvedorIA = new ResolvedorConfigIA(repositorioCredenciales);

// IA con Claude (F13/F15): el asistente (chat) y el análisis de comida (visión)
// usan Claude si hay clave (del profesional o del entorno) y DEGRADAN al
// stub/ML si no. El análisis predictivo del nutricionista lo sirve el ML.
const asistenteNutricional = new AsistenteNutricionalClaude(
  resolvedorIA,
  new AsistenteNutricionalStub(),
);
// Asistente analítico del nutricionista (chat sobre los datos del consultorio).
const asistenteAnalitico = new AsistenteAnaliticoClaude(
  resolvedorIA,
  new AsistenteAnaliticoStub(),
);
const respaldoComida: IAnalisisComidaIA = clienteML
  ? new AnalisisComidaIAHTTP(clienteML, new AnalisisComidaIAStub())
  : new AnalisisComidaIAStub();
const analisisComidaIA = new AnalisisComidaIAClaude(
  resolvedorIA,
  almacenamiento,
  respaldoComida,
);

const analisisPredictivo = clienteML
  ? new AnalisisPredictivoHTTP(clienteML, new AnalisisPredictivoStub())
  : new AnalisisPredictivoStub();

// Datos nutricionales (F12/F15): FatSecret si el profesional cargó credenciales
// (o están en el entorno); si no, Open Food Facts (gratis, sin key) o el nulo.
const configNutricion = obtenerConfigNutricion();
const respaldoNutricion = configNutricion
  ? new ProveedorOpenFoodFacts(configNutricion)
  : new ProveedorNutricionNulo();
const proveedorNutricionLocal = new ProveedorNutricionApp(
  repositorioCredenciales,
  new ClienteFatSecret(),
  respaldoNutricion,
  obtenerConfigFatSecret(),
  // Traduce ES↔EN con la clave de Claude del profesional (si la cargó).
  new TraductorIngredientesIA(resolvedorIA),
);
// Si hay un microservicio de nutrición (Go/Lambda) configurado, lo usamos como
// primario (traduce y filtra afuera) con el proveedor local como respaldo; si no,
// el proveedor local va directo.
const configNutricionServicio = obtenerConfigNutricionServicio();
const proveedorNutricionExterno: IProveedorDatosNutricionales = configNutricionServicio
  ? new ProveedorNutricionHTTP(configNutricionServicio, proveedorNutricionLocal)
  : proveedorNutricionLocal;

// Alimentos propios (F17): si el nutricionista cargó su Excel, la búsqueda usa SU
// lista y desactiva FatSecret. El despachador decide por request (según si hay
// alimentos cargados en el inquilino).
const repositorioAlimentoPropio = new PrismaRepositorioAlimentoPropio(prisma);
const proveedorNutricion: IProveedorDatosNutricionales = new ProveedorNutricionDespachador(
  new ProveedorNutricionPropio(repositorioAlimentoPropio),
  proveedorNutricionExterno,
  repositorioAlimentoPropio,
);
export const servicioAlimentosPropios = new ServicioAlimentosPropios(
  new ImportarAlimentos(repositorioAlimentoPropio),
  new ObtenerEstadoAlimentosPropios(repositorioAlimentoPropio),
  new VaciarAlimentosPropios(repositorioAlimentoPropio),
);

// --- Integraciones (Google): degradación elegante -----------------------------
// Si NO hay credenciales configuradas (obtenerConfigGoogle devuelve null), la app
// funciona igual que siempre: email por SMTP y sin sincronización de calendario.
const configGoogle = obtenerConfigGoogle();
export const proveedorGoogle: IProveedorGoogle | null = configGoogle
  ? new ProveedorGoogle(configGoogle)
  : null;

const smtp = new NodemailerServicioEmail();
let servicioEmail: IServicioEmail = smtp;
let sincronizadorCalendario: ISincronizadorCalendario = new SincronizadorNulo();
let repositorioCuentaConectada: ICuentaConectadaRepositorio | null = null;

if (configGoogle && proveedorGoogle) {
  const cifrador = new CifradorTokens();
  repositorioCuentaConectada = new PrismaRepositorioCuentaConectada(prisma, cifrador);
  const repositorioSincronizacionTurno = new PrismaRepositorioSincronizacionTurno(prisma);
  sincronizadorCalendario = new SincronizadorCalendarioGoogle(
    repositorioCuentaConectada,
    repositorioSincronizacionTurno,
    proveedorGoogle,
    repositorioPaciente,
  );
  // El email sale de la casilla del profesional (Gmail) si la conectó; si no, SMTP.
  servicioEmail = new ServicioEmailConGoogle(repositorioCuentaConectada, proveedorGoogle, smtp);
}

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
  sincronizador: sincronizadorCalendario,
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

// Búsqueda de datos nutricionales para autocompletar ingredientes de recetas.
export const servicioNutricion = crearServicioNutricion({
  proveedor: proveedorNutricion,
  credenciales: repositorioCredenciales,
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
  metricas: repositorioMetrica,
});

// Métricas de dispositivo (wearables): importación, consulta y opt-in por día.
export const servicioMetricas = crearServicioMetricas({ metricas: repositorioMetrica });

// Credenciales de integración del profesional (clave de Claude / FatSecret).
export const servicioCredenciales = crearServicioCredenciales({
  credenciales: repositorioCredenciales,
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

// Integraciones (Google). Los casos de uso son null si no está configurada.
export const servicioIntegraciones = new ServicioIntegraciones(
  configGoogle != null,
  repositorioCuentaConectada ? new ObtenerCuentaGoogle(repositorioCuentaConectada) : null,
  repositorioCuentaConectada ? new GuardarConexionGoogle(repositorioCuentaConectada) : null,
  repositorioCuentaConectada ? new DesconectarGoogle(repositorioCuentaConectada) : null,
);

export const servicioIA = crearServicioIA({
  pacientes: repositorioPaciente,
  objetivos: repositorioObjetivo,
  planes: repositorioPlan,
  recetas: repositorioReceta,
  turnos: repositorioTurno,
  alertas: repositorioAlertaAlimentaria,
  axiomas: repositorioAxioma,
  historial: repositorioHistorialIA,
  asistente: asistenteNutricional,
  asistenteAnalitico,
  analisisComida: analisisComidaIA,
  analisisPredictivo,
  retroalimentacion: new PrismaRepositorioRetroalimentacionInsight(prisma),
  estado: {
    asistenteActivo: () => resolvedorIA.tieneIA(),
    insightsActivo: clienteML != null,
  },
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
  servicioNutricion,
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
  servicioMetricas,
  servicioCredenciales,
  servicioSuperAdmin,
  servicioIntegraciones,
  servicioIA,
  repositorioUsuario,
} as const;

export type Contenedor = typeof contenedor;
