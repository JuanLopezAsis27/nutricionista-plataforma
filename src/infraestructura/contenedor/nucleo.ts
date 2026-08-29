/**
 * Núcleo del contenedor: adaptadores compartidos y repositorios.
 *
 * Acá vive el cableado con el mundo exterior (Prisma, S3, SMTP, Claude, ML,
 * Google, WhatsApp). El armado de los servicios de aplicación queda en
 * ./contenedor, que consume esto. La separación es lo que evita que un solo
 * archivo concentre las ~90 dependencias concretas del sistema.
 *
 * TODO se expone como getter perezoso (ver ./perezoso): nada se construye al
 * importar el módulo, solo cuando alguien lo pide por primera vez.
 *
 * IMPORTANTE: este archivo no debe importar nada de Next (lo consume también
 * el worker de trabajos en segundo plano).
 */

import { perezoso } from "./perezoso";

import { PrismaClienteSingleton } from "@/infraestructura/repositorios/PrismaClienteSingleton";
import { PrismaRepositorioPaciente } from "@/infraestructura/repositorios/PrismaRepositorioPaciente";
import { PrismaRepositorioTurno } from "@/infraestructura/repositorios/PrismaRepositorioTurno";
import { PrismaRepositorioUsuario } from "@/infraestructura/repositorios/PrismaRepositorioUsuario";
import { PrismaRepositorioTokenRecuperacion } from "@/infraestructura/repositorios/PrismaRepositorioTokenRecuperacion";
import { PrismaRepositorioArchivo } from "@/infraestructura/repositorios/PrismaRepositorioArchivo";
import { PrismaRepositorioHistoriaClinica } from "@/infraestructura/repositorios/PrismaRepositorioHistoriaClinica";
import { PrismaRepositorioAntropometria } from "@/infraestructura/repositorios/PrismaRepositorioAntropometria";
import { PrismaRepositorioObjetivoComposicion } from "@/infraestructura/repositorios/PrismaRepositorioObjetivoComposicion";
import { PrismaRepositorioPlantillaAntropometrica } from "@/infraestructura/repositorios/PrismaRepositorioPlantillaAntropometrica";
import { PrismaRepositorioAlertaAlimentaria } from "@/infraestructura/repositorios/PrismaRepositorioAlertaAlimentaria";
import { PrismaRepositorioLaboratorio } from "@/infraestructura/repositorios/PrismaRepositorioLaboratorio";
import { PrismaRepositorioRegistroDiario } from "@/infraestructura/repositorios/PrismaRepositorioRegistroDiario";
import { PrismaRepositorioReceta } from "@/infraestructura/repositorios/PrismaRepositorioReceta";
import { PrismaRepositorioPlan } from "@/infraestructura/repositorios/PrismaRepositorioPlan";
import { PrismaRepositorioGrupoPlan } from "@/infraestructura/repositorios/PrismaRepositorioGrupoPlan";
import { PrismaRepositorioObjetivo } from "@/infraestructura/repositorios/PrismaRepositorioObjetivo";
import { PrismaRepositorioPerfilDeportivo } from "@/infraestructura/repositorios/PrismaRepositorioPerfilDeportivo";
import { PrismaRepositorioCompetencia } from "@/infraestructura/repositorios/PrismaRepositorioCompetencia";
import { PrismaRepositorioMaterial } from "@/infraestructura/repositorios/PrismaRepositorioMaterial";
import { PrismaRepositorioSuplemento } from "@/infraestructura/repositorios/PrismaRepositorioSuplemento";
import { PrismaRepositorioAlertaSeguimiento } from "@/infraestructura/repositorios/PrismaRepositorioAlertaSeguimiento";
import { PrismaRepositorioPlantillaEmail } from "@/infraestructura/repositorios/PrismaRepositorioPlantillaEmail";
import { PrismaRepositorioEmailEnviado } from "@/infraestructura/repositorios/PrismaRepositorioEmailEnviado";
import { PrismaRepositorioEstadisticas } from "@/infraestructura/repositorios/PrismaRepositorioEstadisticas";
import { PrismaRepositorioMensajeria } from "@/infraestructura/repositorios/PrismaRepositorioMensajeria";
import { PrismaRepositorioHistorialIA } from "@/infraestructura/repositorios/PrismaRepositorioHistorialIA";
import { PrismaRepositorioConfiguracion } from "@/infraestructura/repositorios/PrismaRepositorioConfiguracion";
import { PrismaRepositorioNutricionista } from "@/infraestructura/repositorios/PrismaRepositorioNutricionista";
import { PrismaRepositorioRecordatorioWhatsapp } from "@/infraestructura/repositorios/PrismaRepositorioRecordatorioWhatsapp";
import { PrismaRepositorioMensajeWhatsapp } from "@/infraestructura/repositorios/PrismaRepositorioMensajeWhatsapp";
import { PrismaRepositorioPlantillaWhatsapp } from "@/infraestructura/repositorios/PrismaRepositorioPlantillaWhatsapp";
import { PrismaRepositorioConfiguracionRecordatorios } from "@/infraestructura/repositorios/PrismaRepositorioConfiguracionRecordatorios";
import { PrismaRepositorioAxioma } from "@/infraestructura/repositorios/PrismaRepositorioAxioma";
import { PrismaRepositorioMetricaDispositivo } from "@/infraestructura/repositorios/PrismaRepositorioMetricaDispositivo";
import { PrismaRepositorioAlimentoPropio } from "@/infraestructura/repositorios/PrismaRepositorioAlimentoPropio";
import { PrismaRepositorioRetroalimentacionInsight } from "@/infraestructura/repositorios/PrismaRepositorioRetroalimentacionInsight";
import { PrismaRepositorioCredenciales } from "@/infraestructura/repositorios/PrismaRepositorioCredenciales";
import { PrismaRepositorioCuentaConectada } from "@/infraestructura/repositorios/PrismaRepositorioCuentaConectada";
import { PrismaRepositorioSincronizacionTurno } from "@/infraestructura/repositorios/PrismaRepositorioSincronizacionTurno";

import { BcryptHasheador } from "@/infraestructura/seguridad/BcryptHasheador";
import { GeneradorTokensCrypto } from "@/infraestructura/seguridad/GeneradorTokensCrypto";
import { CifradorTokens } from "@/infraestructura/seguridad/CifradorTokens";
import { AlmacenamientoMinIO } from "@/infraestructura/almacenamiento/AlmacenamientoMinIO";
import { RelojSistema } from "@/infraestructura/fecha/RelojSistema";
import { NodemailerServicioEmail } from "@/infraestructura/email/NodemailerServicioEmail";
import { BusEventosPostgres } from "@/infraestructura/tiempo-real/BusEventosPostgres";

// IA (Claude + ML).
import { AsistenteNutricionalStub } from "@/infraestructura/ia/AsistenteNutricionalStub";
import { AnalisisComidaIAStub } from "@/infraestructura/ia/AnalisisComidaIAStub";
import { AnalisisPredictivoStub } from "@/infraestructura/ia/AnalisisPredictivoStub";
import { AsistenteNutricionalClaude } from "@/infraestructura/ia/AsistenteNutricionalClaude";
import { AsistenteAnaliticoClaude } from "@/infraestructura/ia/AsistenteAnaliticoClaude";
import { AsistenteAnaliticoStub } from "@/infraestructura/ia/AsistenteAnaliticoStub";
import { AnalisisComidaIAClaude } from "@/infraestructura/ia/AnalisisComidaIAClaude";
import { ResolvedorConfigIA } from "@/infraestructura/ia/ResolvedorConfigIA";
import { TraductorIngredientesIA } from "@/infraestructura/ia/TraductorIngredientesIA";
import { obtenerConfigML } from "@/infraestructura/ml/configML";
import { ClienteML } from "@/infraestructura/ml/clienteML";
import { AnalisisPredictivoHTTP } from "@/infraestructura/ml/AnalisisPredictivoHTTP";
import { AnalisisComidaIAHTTP } from "@/infraestructura/ml/AnalisisComidaIAHTTP";
import type { IAnalisisComidaIA } from "@/dominio/servicios/IAnalisisComidaIA";

// Datos nutricionales de ingredientes.
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
import type { IProveedorDatosNutricionales } from "@/dominio/servicios/IProveedorDatosNutricionales";

// Integraciones (Google).
import { obtenerConfigGoogle } from "@/infraestructura/integraciones/configGoogle";
import { ProveedorGoogle } from "@/infraestructura/integraciones/ProveedorGoogle";
import { SincronizadorCalendarioGoogle } from "@/infraestructura/integraciones/SincronizadorCalendarioGoogle";
import { SincronizadorNulo } from "@/infraestructura/integraciones/SincronizadorNulo";
import { ServicioEmailConGoogle } from "@/infraestructura/integraciones/ServicioEmailConGoogle";
import type { IProveedorGoogle } from "@/dominio/servicios/IProveedorGoogle";
import type { ISincronizadorCalendario } from "@/dominio/servicios/ISincronizadorCalendario";
import type { ICuentaConectadaRepositorio } from "@/dominio/repositorios/ICuentaConectadaRepositorio";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";

// WhatsApp.
import { ResolvedorProveedorWhatsapp } from "@/infraestructura/whatsapp/ResolvedorProveedorWhatsapp";
import { DirectorioWhatsapp } from "@/infraestructura/whatsapp/DirectorioWhatsapp";

// Aprovisionamiento de inquilinos.
import { ProvisionadorNutricionista } from "@/infraestructura/aprovisionamiento/ProvisionadorNutricionista";

// --- Configuración de entorno -------------------------------------------------

/** Nombre del profesional para membretes y firmas de emails. */
export const NOMBRE_PROFESIONAL =
  process.env.NOMBRE_PROFESIONAL ?? "Lic. López Asis Nicolás";

/** URL pública de la app (la usan los enlaces de los emails). */
export const urlApp = (): string =>
  process.env.APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

// --- Cliente de base de datos --------------------------------------------------

const prisma = perezoso(() => PrismaClienteSingleton.obtenerInstancia());

// --- Repositorios ---------------------------------------------------------------

export const repositorioPaciente = perezoso(
  () => new PrismaRepositorioPaciente(prisma()),
);
export const repositorioTurno = perezoso(
  () => new PrismaRepositorioTurno(prisma()),
);
export const repositorioUsuario = perezoso(
  () => new PrismaRepositorioUsuario(prisma()),
);
export const repositorioTokenRecuperacion = perezoso(
  () => new PrismaRepositorioTokenRecuperacion(prisma()),
);
export const repositorioArchivo = perezoso(
  () => new PrismaRepositorioArchivo(prisma()),
);
export const repositorioHistoriaClinica = perezoso(
  () => new PrismaRepositorioHistoriaClinica(prisma()),
);
export const repositorioAntropometria = perezoso(
  () => new PrismaRepositorioAntropometria(prisma()),
);
export const repositorioObjetivoComposicion = perezoso(
  () => new PrismaRepositorioObjetivoComposicion(prisma()),
);
export const repositorioPlantillaAntropometrica = perezoso(
  () => new PrismaRepositorioPlantillaAntropometrica(prisma()),
);
export const repositorioAlertaAlimentaria = perezoso(
  () => new PrismaRepositorioAlertaAlimentaria(prisma()),
);
export const repositorioLaboratorio = perezoso(
  () => new PrismaRepositorioLaboratorio(prisma()),
);
export const repositorioRegistroDiario = perezoso(
  () => new PrismaRepositorioRegistroDiario(prisma()),
);
export const repositorioReceta = perezoso(
  () => new PrismaRepositorioReceta(prisma()),
);
export const repositorioPlan = perezoso(
  () => new PrismaRepositorioPlan(prisma()),
);
export const repositorioGrupoPlan = perezoso(
  () => new PrismaRepositorioGrupoPlan(prisma()),
);
export const repositorioObjetivo = perezoso(
  () => new PrismaRepositorioObjetivo(prisma()),
);
export const repositorioPerfilDeportivo = perezoso(
  () => new PrismaRepositorioPerfilDeportivo(prisma()),
);
export const repositorioCompetencia = perezoso(
  () => new PrismaRepositorioCompetencia(prisma()),
);
export const repositorioMaterial = perezoso(
  () => new PrismaRepositorioMaterial(prisma()),
);
export const repositorioSuplemento = perezoso(
  () => new PrismaRepositorioSuplemento(prisma()),
);
export const repositorioAlertaSeguimiento = perezoso(
  () => new PrismaRepositorioAlertaSeguimiento(prisma()),
);
export const repositorioPlantillaEmail = perezoso(
  () => new PrismaRepositorioPlantillaEmail(prisma()),
);
export const repositorioEmailEnviado = perezoso(
  () => new PrismaRepositorioEmailEnviado(prisma()),
);
export const repositorioEstadisticas = perezoso(
  () => new PrismaRepositorioEstadisticas(prisma()),
);
export const repositorioMensajeria = perezoso(
  () => new PrismaRepositorioMensajeria(prisma()),
);
export const repositorioHistorialIA = perezoso(
  () => new PrismaRepositorioHistorialIA(prisma()),
);
export const repositorioConfiguracion = perezoso(
  () => new PrismaRepositorioConfiguracion(prisma()),
);
/**
 * Registro de inquilinos: la fila que ahora referencian por FK las 45 tablas
 * de inquilino. No es una tabla de inquilino, es la tabla DE los inquilinos.
 */
export const repositorioNutricionista = perezoso(
  () => new PrismaRepositorioNutricionista(prisma()),
);
export const repositorioRecordatorioWhatsapp = perezoso(
  () => new PrismaRepositorioRecordatorioWhatsapp(prisma()),
);
export const repositorioMensajeWhatsapp = perezoso(
  () => new PrismaRepositorioMensajeWhatsapp(prisma()),
);
export const repositorioPlantillaWhatsapp = perezoso(
  () => new PrismaRepositorioPlantillaWhatsapp(prisma()),
);
export const repositorioConfiguracionRecordatorios = perezoso(
  () => new PrismaRepositorioConfiguracionRecordatorios(prisma()),
);
export const repositorioAxioma = perezoso(
  () => new PrismaRepositorioAxioma(prisma()),
);
export const repositorioMetrica = perezoso(
  () => new PrismaRepositorioMetricaDispositivo(prisma()),
);
export const repositorioAlimentoPropio = perezoso(
  () => new PrismaRepositorioAlimentoPropio(prisma()),
);
export const repositorioRetroalimentacion = perezoso(
  () => new PrismaRepositorioRetroalimentacionInsight(prisma()),
);

// --- Adaptadores base -----------------------------------------------------------

export const hasheador = perezoso(() => new BcryptHasheador());
export const generadorTokens = perezoso(() => new GeneradorTokensCrypto());
export const almacenamiento = perezoso(() => new AlmacenamientoMinIO());
export const reloj = perezoso(() => new RelojSistema());

/**
 * Bus de eventos en tiempo real (Postgres LISTEN/NOTIFY). Lo usan los
 * servicios (publicar) y la subscription tRPC (suscribir); el worker solo
 * publica desde su propio proceso.
 */
export const busEventos = perezoso(() => new BusEventosPostgres());

// --- Credenciales por profesional ------------------------------------------------

/** Cifrador de credenciales; null si no hay TOKENS_SECRET configurado. */
const cifradorCredenciales = perezoso(() =>
  process.env.TOKENS_SECRET ? new CifradorTokens() : null,
);

/**
 * Credenciales de integración por profesional: repo cifrado que resuelve la
 * clave del inquilino POR REQUEST. Así el profesional carga su propia clave
 * de Claude o FatSecret desde la app.
 */
export const repositorioCredenciales = perezoso(
  () => new PrismaRepositorioCredenciales(prisma(), cifradorCredenciales()),
);

const resolvedorIA = perezoso(
  () => new ResolvedorConfigIA(repositorioCredenciales()),
);

/** ¿Hay alguna clave de IA disponible (del profesional o del entorno)? */
export const tieneIA = (): Promise<boolean> => resolvedorIA().tieneIA();

// --- ML (microservicio opcional) --------------------------------------------------

const configML = perezoso(() => obtenerConfigML());

/**
 * Si hay microservicio configurado (ML_SERVICE_URL) se usa el adaptador HTTP
 * con FALLBACK al stub; si no, el stub directo. La UI no cambia.
 */
const clienteML = perezoso(() => {
  const config = configML();
  return config ? new ClienteML(config) : null;
});

export const hayML = (): boolean => clienteML() != null;

// --- IA (Claude, con degradación) --------------------------------------------------

/**
 * El asistente (chat) y el análisis de comida (visión) usan Claude si hay
 * clave —del profesional o del entorno— y DEGRADAN al stub/ML si no.
 */
export const asistenteNutricional = perezoso(
  () =>
    new AsistenteNutricionalClaude(
      resolvedorIA(),
      new AsistenteNutricionalStub(),
    ),
);

/** Asistente analítico del nutricionista (chat sobre los datos del consultorio). */
export const asistenteAnalitico = perezoso(
  () =>
    new AsistenteAnaliticoClaude(resolvedorIA(), new AsistenteAnaliticoStub()),
);

export const analisisComidaIA = perezoso(() => {
  const cliente = clienteML();
  const respaldo: IAnalisisComidaIA = cliente
    ? new AnalisisComidaIAHTTP(cliente, new AnalisisComidaIAStub())
    : new AnalisisComidaIAStub();
  return new AnalisisComidaIAClaude(resolvedorIA(), almacenamiento(), respaldo);
});

/** El análisis predictivo del nutricionista lo sirve el ML. */
export const analisisPredictivo = perezoso(() => {
  const cliente = clienteML();
  return cliente
    ? new AnalisisPredictivoHTTP(cliente, new AnalisisPredictivoStub())
    : new AnalisisPredictivoStub();
});

// --- Datos nutricionales -----------------------------------------------------------

/**
 * Cadena de proveedores, de más específico a más genérico:
 *   alimentos propios del profesional → microservicio → FatSecret →
 *   Open Food Facts → nulo.
 * Cada eslabón degrada al siguiente en vez de romper la búsqueda.
 */
export const proveedorNutricion = perezoso((): IProveedorDatosNutricionales => {
  const configNutricion = obtenerConfigNutricion();
  const respaldo = configNutricion
    ? new ProveedorOpenFoodFacts(configNutricion)
    : new ProveedorNutricionNulo();

  const local = new ProveedorNutricionApp(
    repositorioCredenciales(),
    new ClienteFatSecret(),
    respaldo,
    obtenerConfigFatSecret(),
    // Traduce ES↔EN con la clave de Claude del profesional (si la cargó).
    new TraductorIngredientesIA(resolvedorIA()),
  );

  // Si hay un microservicio de nutrición (Go/Lambda) configurado, es el
  // primario (traduce y filtra afuera) con el local como respaldo.
  const configServicio = obtenerConfigNutricionServicio();
  const externo: IProveedorDatosNutricionales = configServicio
    ? new ProveedorNutricionHTTP(configServicio, local)
    : local;

  // Si el nutricionista cargó su Excel, la búsqueda usa SU lista y desactiva
  // FatSecret. El despachador decide por request.
  return new ProveedorNutricionDespachador(
    new ProveedorNutricionPropio(repositorioAlimentoPropio()),
    externo,
    repositorioAlimentoPropio(),
  );
});

// --- Integraciones con Google (degradación elegante) --------------------------------

/**
 * Si NO hay credenciales configuradas, la app funciona igual que siempre:
 * email por SMTP y sin sincronización de calendario.
 */
const configGoogle = perezoso(() => obtenerConfigGoogle());

export const proveedorGoogle = perezoso((): IProveedorGoogle | null => {
  const config = configGoogle();
  return config ? new ProveedorGoogle(config) : null;
});

export const hayGoogle = (): boolean => configGoogle() != null;

export const repositorioCuentaConectada = perezoso(
  (): ICuentaConectadaRepositorio | null =>
    configGoogle() && proveedorGoogle()
      ? new PrismaRepositorioCuentaConectada(prisma(), new CifradorTokens())
      : null,
);

export const sincronizadorCalendario = perezoso(
  (): ISincronizadorCalendario => {
    const cuentas = repositorioCuentaConectada();
    const google = proveedorGoogle();
    if (!cuentas || !google) {
      return new SincronizadorNulo();
    }
    return new SincronizadorCalendarioGoogle(
      cuentas,
      new PrismaRepositorioSincronizacionTurno(prisma()),
      google,
      repositorioPaciente(),
      // El sincronizador consulta la config para saber si el medio CALENDARIO
      // está activo y si hay que invitar al paciente al evento.
      repositorioConfiguracionRecordatorios(),
    );
  },
);

/** El email sale de la casilla del profesional (Gmail) si la conectó; si no, SMTP. */
export const servicioEmail = perezoso((): IServicioEmail => {
  const smtp = new NodemailerServicioEmail();
  const cuentas = repositorioCuentaConectada();
  const google = proveedorGoogle();
  return cuentas && google
    ? new ServicioEmailConGoogle(cuentas, google, smtp)
    : smtp;
});

// --- WhatsApp ------------------------------------------------------------------------

/**
 * Se resuelve por request: con las credenciales de la Cloud API cargadas
 * envía de verdad, y sin ellas degrada al enlace wa.me.
 */
export const proveedorWhatsapp = perezoso(
  () => new ResolvedorProveedorWhatsapp(repositorioCredenciales()),
);

/** Resuelve el inquilino dueño de un webhook de WhatsApp (corre sin sesión). */
export const directorioWhatsapp = perezoso(
  () => new DirectorioWhatsapp(prisma(), cifradorCredenciales()),
);

// --- Aprovisionamiento ----------------------------------------------------------------

export const provisionadorNutricionista = perezoso(
  () =>
    new ProvisionadorNutricionista(
      repositorioConfiguracion(),
      repositorioPlantillaEmail(),
      repositorioAxioma(),
      repositorioPlantillaWhatsapp(),
      repositorioConfiguracionRecordatorios(),
    ),
);
