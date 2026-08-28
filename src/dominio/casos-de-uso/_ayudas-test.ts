import { vi } from "vitest";
import type { IPacienteRepositorio } from "../repositorios/IPacienteRepositorio";
import type { ITurnoRepositorio } from "../repositorios/ITurnoRepositorio";
import type { IUsuarioRepositorio } from "../repositorios/IUsuarioRepositorio";
import type { ITokenRecuperacionRepositorio } from "../repositorios/ITokenRecuperacionRepositorio";
import type { IGeneradorTokens } from "../servicios/IGeneradorTokens";
import type { IArchivoRepositorio } from "../repositorios/IArchivoRepositorio";
import type { IHistoriaClinicaRepositorio } from "../repositorios/IHistoriaClinicaRepositorio";
import type { IAntropometriaRepositorio } from "../repositorios/IAntropometriaRepositorio";
import type { IObjetivoComposicionRepositorio } from "../repositorios/IObjetivoComposicionRepositorio";
import type { IAlertaAlimentariaRepositorio } from "../repositorios/IAlertaAlimentariaRepositorio";
import type { ILaboratorioRepositorio } from "../repositorios/ILaboratorioRepositorio";
import type { IRegistroDiarioRepositorio } from "../repositorios/IRegistroDiarioRepositorio";
import type { IRecetaRepositorio } from "../repositorios/IRecetaRepositorio";
import type { IMetricaDispositivoRepositorio } from "../repositorios/IMetricaDispositivoRepositorio";
import type { IPlanRepositorio } from "../repositorios/IPlanRepositorio";
import type { IObjetivoRepositorio } from "../repositorios/IObjetivoRepositorio";
import type { IPerfilDeportivoRepositorio } from "../repositorios/IPerfilDeportivoRepositorio";
import type { ICompetenciaRepositorio } from "../repositorios/ICompetenciaRepositorio";
import type { IMaterialRepositorio } from "../repositorios/IMaterialRepositorio";
import type { ISuplementoRepositorio } from "../repositorios/ISuplementoRepositorio";
import type { IAlertaSeguimientoRepositorio } from "../repositorios/IAlertaSeguimientoRepositorio";
import type { IPlantillaEmailRepositorio } from "../repositorios/IPlantillaEmailRepositorio";
import type { IEmailEnviadoRepositorio } from "../repositorios/IEmailEnviadoRepositorio";
import type { IEstadisticasRepositorio } from "../repositorios/IEstadisticasRepositorio";
import type { IMensajeriaRepositorio } from "../repositorios/IMensajeriaRepositorio";
import type { IHistorialIARepositorio } from "../repositorios/IHistorialIARepositorio";
import type { IConfiguracionRepositorio } from "../repositorios/IConfiguracionRepositorio";
import type { INutricionistaRepositorio } from "../repositorios/INutricionistaRepositorio";
import type { IRecordatorioWhatsappRepositorio } from "../repositorios/IRecordatorioWhatsappRepositorio";
import type { IProveedorWhatsapp } from "../servicios/IProveedorWhatsapp";
import type { IMensajeWhatsappRepositorio } from "../repositorios/IMensajeWhatsappRepositorio";
import { MensajeWhatsapp } from "../entidades/MensajeWhatsapp";
import { RecordatorioWhatsapp } from "../entidades/RecordatorioWhatsapp";
import type { IAxiomaRepositorio } from "../repositorios/IAxiomaRepositorio";
import type { IAlimentoPropioRepositorio } from "../repositorios/IAlimentoPropioRepositorio";
import type { IAsistenteAnalitico } from "../servicios/IAsistenteAnalitico";
import type { IRetroalimentacionInsightRepositorio } from "../repositorios/IRetroalimentacionInsightRepositorio";
import type { ICuentaConectadaRepositorio } from "../repositorios/ICuentaConectadaRepositorio";
import type { IHasheadorContrasena } from "../servicios/IHasheadorContrasena";
import type { IAlmacenamientoArchivos } from "../servicios/IAlmacenamientoArchivos";
import type { IServicioEmail } from "../servicios/IServicioEmail";
import type { IColaTrabajos } from "../servicios/IColaTrabajos";
import type { IRelojFecha } from "../servicios/IRelojFecha";
import type { IBusEventos } from "../servicios/IBusEventos";
import type { IAsistenteNutricional } from "../servicios/IAsistenteNutricional";
import type { IAnalisisComidaIA } from "../servicios/IAnalisisComidaIA";
import type { IAnalisisPredictivo } from "../servicios/IAnalisisPredictivo";
import { Paciente, type DatosNuevoPaciente } from "../entidades/Paciente";
import {
  ObjetivoComposicion,
  type DatosObjetivoComposicion,
} from "../entidades/ObjetivoComposicion";
import { Turno, type DatosNuevoTurno } from "../entidades/Turno";
import { Usuario, type DatosNuevoUsuario } from "../entidades/Usuario";
import { TokenRecuperacion } from "../entidades/TokenRecuperacion";
import { Archivo, type DatosNuevoArchivo } from "../entidades/Archivo";
import {
  HistoriaClinica,
  type DatosHistoriaClinica,
} from "../entidades/HistoriaClinica";
import {
  Antropometria,
  type DatosNuevaAntropometria,
} from "../entidades/Antropometria";
import {
  AlertaAlimentaria,
  type DatosNuevaAlertaAlimentaria,
} from "../entidades/AlertaAlimentaria";
import { Laboratorio, type DatosNuevoLaboratorio } from "../entidades/Laboratorio";
import { RegistroDiario, type DatosDia } from "../entidades/RegistroDiario";
import { Receta, type DatosNuevaReceta } from "../entidades/Receta";
import {
  MetricaDispositivo,
  type DatosMetricaDispositivo,
} from "../entidades/MetricaDispositivo";
import {
  PlanNutricional,
  type DatosNuevoPlan,
} from "../entidades/PlanNutricional";
import { Objetivo, type DatosNuevoObjetivo } from "../entidades/Objetivo";
import { PerfilDeportivo, type DatosPerfilDeportivo } from "../entidades/PerfilDeportivo";
import { Competencia, type DatosCompetencia } from "../entidades/Competencia";
import {
  MaterialBiblioteca,
  type DatosNuevoMaterial,
} from "../entidades/MaterialBiblioteca";
import { Suplemento, type DatosNuevoSuplemento } from "../entidades/Suplemento";
import {
  AlertaSeguimiento,
  type DatosNuevaAlertaSeguimiento,
} from "../entidades/AlertaSeguimiento";
import { PlantillaEmail, type DatosNuevaPlantilla } from "../entidades/PlantillaEmail";
import { Conversacion } from "../entidades/Conversacion";
import { Mensaje, type DatosNuevoMensaje } from "../entidades/Mensaje";
import { ConfiguracionConsultorio } from "../entidades/ConfiguracionConsultorio";
import { AxiomaNutricional, type DatosNuevoAxioma } from "../entidades/AxiomaNutricional";
import { CuentaConectada } from "../entidades/CuentaConectada";

/**
 * Ayudas para los tests de casos de uso.
 *
 * Provee constructores de repositorios mock que implementan las interfaces
 * del dominio (nunca dependen de Prisma) y fábricas de entidades de ejemplo.
 * No es un archivo de test (no contiene `describe`).
 */

export function mockPacienteRepositorio(
  parcial: Partial<IPacienteRepositorio> = {},
): IPacienteRepositorio {
  return {
    crear: vi.fn(async (p: Paciente) => p),
    actualizar: vi.fn(async (p: Paciente) => p),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    obtenerPorEmail: vi.fn(async () => null),
    obtenerPorTelefonoE164: vi.fn(async () => null),
    listar: vi.fn(async () => []),
    contar: vi.fn(async () => 0),
    ...parcial,
  };
}

export function mockTurnoRepositorio(
  parcial: Partial<ITurnoRepositorio> = {},
): ITurnoRepositorio {
  return {
    crear: vi.fn(async (t: Turno) => t),
    actualizar: vi.fn(async (t: Turno) => t),
    obtenerPorId: vi.fn(async () => null),
    obtenerEnFecha: vi.fn(async () => []),
    obtenerPorPaciente: vi.fn(async () => []),
    listar: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockUsuarioRepositorio(
  parcial: Partial<IUsuarioRepositorio> = {},
): IUsuarioRepositorio {
  return {
    crear: vi.fn(async (u: Usuario) => u),
    actualizar: vi.fn(async (u: Usuario) => u),
    obtenerPorId: vi.fn(async () => null),
    obtenerPorEmail: vi.fn(async () => null),
    obtenerPorPacienteId: vi.fn(async () => null),
    listarPorRol: vi.fn(async () => []),
    eliminarPorPacienteId: vi.fn(async () => {}),
    ...parcial,
  };
}

export function mockTokenRecuperacionRepositorio(
  parcial: Partial<ITokenRecuperacionRepositorio> = {},
): ITokenRecuperacionRepositorio {
  return {
    crear: vi.fn(async (t: TokenRecuperacion) => t),
    obtenerPorHash: vi.fn(async () => null),
    marcarUsado: vi.fn(async () => {}),
    eliminarDeUsuario: vi.fn(async () => {}),
    ...parcial,
  };
}

export function mockGeneradorTokens(parcial: Partial<IGeneradorTokens> = {}): IGeneradorTokens {
  return {
    // Genera un token determinista y su "hash" (prefijo) para tests.
    generar: vi.fn(() => ({ token: "token-claro", hash: "hash:token-claro" })),
    hashear: vi.fn((token: string) => `hash:${token}`),
    ...parcial,
  };
}

export function mockHasheador(): IHasheadorContrasena {
  return {
    hashear: vi.fn(async (plano: string) => `hash:${plano}`),
    verificar: vi.fn(async (plano: string, hash: string) => hash === `hash:${plano}`),
  };
}

export function mockArchivoRepositorio(
  parcial: Partial<IArchivoRepositorio> = {},
): IArchivoRepositorio {
  return {
    crear: vi.fn(async (a: Archivo) => a),
    obtenerPorId: vi.fn(async () => null),
    eliminar: vi.fn(async () => {}),
    listarPorDueno: vi.fn(async () => []),
    vincularDueno: vi.fn(async () => {}),
    obtenerDueno: vi.fn(async () => null),
    listarClaves: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockAlmacenamientoArchivos(
  parcial: Partial<IAlmacenamientoArchivos> = {},
): IAlmacenamientoArchivos {
  return {
    subir: vi.fn(async () => {}),
    generarUrlLectura: vi.fn(async (clave: string) => `https://bucket.local/${clave}?firma`),
    eliminar: vi.fn(async () => {}),
    listarClaves: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockHistoriaClinicaRepositorio(
  parcial: Partial<IHistoriaClinicaRepositorio> = {},
): IHistoriaClinicaRepositorio {
  return {
    guardar: vi.fn(async (h: HistoriaClinica) => h),
    obtenerPorPaciente: vi.fn(async () => null),
    ...parcial,
  };
}

export function mockAntropometriaRepositorio(
  parcial: Partial<IAntropometriaRepositorio> = {},
): IAntropometriaRepositorio {
  return {
    crear: vi.fn(async (m: Antropometria) => m),
    actualizar: vi.fn(async (m: Antropometria) => m),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    listarPorPaciente: vi.fn(async () => []),
    existeEnFecha: vi.fn(async () => false),
    ...parcial,
  };
}

export function mockObjetivoComposicionRepositorio(
  parcial: Partial<IObjetivoComposicionRepositorio> = {},
): IObjetivoComposicionRepositorio {
  return {
    guardar: vi.fn(async (objetivo: ObjetivoComposicion) => objetivo),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    obtenerPorVariable: vi.fn(async () => null),
    listarPorPaciente: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockAlertaAlimentariaRepositorio(
  parcial: Partial<IAlertaAlimentariaRepositorio> = {},
): IAlertaAlimentariaRepositorio {
  return {
    crear: vi.fn(async (a: AlertaAlimentaria) => a),
    actualizar: vi.fn(async (a: AlertaAlimentaria) => a),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    listarPorPaciente: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockLaboratorioRepositorio(
  parcial: Partial<ILaboratorioRepositorio> = {},
): ILaboratorioRepositorio {
  return {
    crear: vi.fn(async (l: Laboratorio) => l),
    actualizar: vi.fn(async (l: Laboratorio) => l),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    listarPorPaciente: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockRegistroDiarioRepositorio(
  parcial: Partial<IRegistroDiarioRepositorio> = {},
): IRegistroDiarioRepositorio {
  return {
    crear: vi.fn(async (r: RegistroDiario) => r),
    actualizarEscalares: vi.fn(async (r: RegistroDiario) => r),
    obtenerPorPacienteYFecha: vi.fn(async () => null),
    listarPorRango: vi.fn(async () => []),
    contarRegistros: vi.fn(async () => 0),
    resumenPorPacienteEnRango: vi.fn(async () => new Map()),
    agregarComida: vi.fn(async () => {}),
    eliminarComida: vi.fn(async () => {}),
    obtenerComida: vi.fn(async () => null),
    agregarActividad: vi.fn(async () => {}),
    eliminarActividad: vi.fn(async () => {}),
    obtenerActividad: vi.fn(async () => null),
    ...parcial,
  };
}

export function mockRecetaRepositorio(
  parcial: Partial<IRecetaRepositorio> = {},
): IRecetaRepositorio {
  return {
    crear: vi.fn(async (r: Receta) => r),
    actualizar: vi.fn(async (r: Receta) => r),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    listar: vi.fn(async () => []),
    contar: vi.fn(async () => 0),
    asignarAPaciente: vi.fn(async () => {}),
    desasignarDePaciente: vi.fn(async () => {}),
    listarPorPaciente: vi.fn(async () => []),
    listarPacientesAsignados: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockMetricaDispositivoRepositorio(
  parcial: Partial<IMetricaDispositivoRepositorio> = {},
): IMetricaDispositivoRepositorio {
  return {
    guardar: vi.fn(async () => {}),
    listarPorRango: vi.fn(async () => []),
    fijarInclusion: vi.fn(async () => {}),
    ...parcial,
  };
}

export function mockPlanRepositorio(
  parcial: Partial<IPlanRepositorio> = {},
): IPlanRepositorio {
  return {
    crear: vi.fn(async (p: PlanNutricional) => p),
    actualizar: vi.fn(async (p: PlanNutricional) => p),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    listar: vi.fn(async () => []),
    contar: vi.fn(async () => 0),
    marcarArchivado: vi.fn(async () => {}),
    contarAsignacionesActivasDePlan: vi.fn(async () => 0),
    asignarAPaciente: vi.fn(async (a) => a),
    desactivarAsignacionesDe: vi.fn(async () => {}),
    obtenerAsignacionActiva: vi.fn(async () => null),
    obtenerPlanActivoDePaciente: vi.fn(async () => null),
    listarAsignacionesActivasVencidas: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockSuplementoRepositorio(
  parcial: Partial<ISuplementoRepositorio> = {},
): ISuplementoRepositorio {
  return {
    crear: vi.fn(async (s: Suplemento) => s),
    actualizar: vi.fn(async (s: Suplemento) => s),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    listarPorPaciente: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockAlertaSeguimientoRepositorio(
  parcial: Partial<IAlertaSeguimientoRepositorio> = {},
): IAlertaSeguimientoRepositorio {
  return {
    crearSiNoExistePendiente: vi.fn(async () => true),
    actualizar: vi.fn(async (a: AlertaSeguimiento) => a),
    obtenerPorId: vi.fn(async () => null),
    listarPendientes: vi.fn(async () => []),
    contarPendientes: vi.fn(async () => 0),
    ...parcial,
  };
}

export function mockObjetivoRepositorio(
  parcial: Partial<IObjetivoRepositorio> = {},
): IObjetivoRepositorio {
  return {
    crear: vi.fn(async (o: Objetivo) => o),
    actualizar: vi.fn(async (o: Objetivo) => o),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    listarPorPaciente: vi.fn(async () => []),
    agregarEstrategia: vi.fn(async () => {}),
    actualizarEstrategia: vi.fn(async () => {}),
    eliminarEstrategia: vi.fn(async () => {}),
    listarHistorial: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockPerfilDeportivoRepositorio(
  parcial: Partial<IPerfilDeportivoRepositorio> = {},
): IPerfilDeportivoRepositorio {
  return {
    obtenerPorPaciente: vi.fn(async () => null),
    guardar: vi.fn(async (p: PerfilDeportivo) => p),
    eliminarPorPaciente: vi.fn(async () => {}),
    ...parcial,
  };
}

export function mockCompetenciaRepositorio(
  parcial: Partial<ICompetenciaRepositorio> = {},
): ICompetenciaRepositorio {
  return {
    crear: vi.fn(async (c: Competencia) => c),
    actualizar: vi.fn(async (c: Competencia) => c),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    listarPorPaciente: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockMaterialRepositorio(
  parcial: Partial<IMaterialRepositorio> = {},
): IMaterialRepositorio {
  return {
    crear: vi.fn(async (m: MaterialBiblioteca) => m),
    actualizar: vi.fn(async (m: MaterialBiblioteca) => m),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    listar: vi.fn(async () => []),
    contar: vi.fn(async () => 0),
    asignarAPaciente: vi.fn(async () => {}),
    desasignarDePaciente: vi.fn(async () => {}),
    listarPorPaciente: vi.fn(async () => []),
    listarPacientesAsignados: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockPlantillaEmailRepositorio(
  parcial: Partial<IPlantillaEmailRepositorio> = {},
): IPlantillaEmailRepositorio {
  return {
    crear: vi.fn(async (p: PlantillaEmail) => p),
    actualizar: vi.fn(async (p: PlantillaEmail) => p),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    obtenerPorClave: vi.fn(async () => null),
    listar: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockEmailEnviadoRepositorio(
  parcial: Partial<IEmailEnviadoRepositorio> = {},
): IEmailEnviadoRepositorio {
  return {
    registrar: vi.fn(async () => {}),
    yaEnviado: vi.fn(async () => false),
    listarRecientes: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockEstadisticasRepositorio(
  parcial: Partial<IEstadisticasRepositorio> = {},
): IEstadisticasRepositorio {
  return {
    obtener: vi.fn(async () => ({
      pacientesActivos: 0,
      pacientesNuevos: 0,
      pacientesEnRiesgo: 0,
      turnosPorEstado: { PENDIENTE: 0, CONFIRMADO: 0, CANCELADO: 0, COMPLETADO: 0 },
      ingresoCobrado: 0,
      ingresoPendiente: 0,
      serieMensual: [],
    })),
    listarPacientes: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockMensajeriaRepositorio(
  parcial: Partial<IMensajeriaRepositorio> = {},
): IMensajeriaRepositorio {
  return {
    obtenerConversacionPorId: vi.fn(async () => null),
    obtenerConversacionPorPaciente: vi.fn(async () => null),
    crearConversacion: vi.fn(async (c: Conversacion) => c),
    actualizarConversacion: vi.fn(async (c: Conversacion) => c),
    listarResumen: vi.fn(async () => []),
    crearMensaje: vi.fn(async (m: Mensaje) => m),
    listarMensajes: vi.fn(async () => []),
    marcarLeidos: vi.fn(async () => {}),
    contarNoLeidos: vi.fn(async () => 0),
    ...parcial,
  };
}

export function mockBusEventos(parcial: Partial<IBusEventos> = {}): IBusEventos {
  return {
    publicar: vi.fn(async () => {}),
    // eslint-disable-next-line require-yield
    suscribir: vi.fn(async function* () {}),
    ...parcial,
  };
}

export function mockHistorialIARepositorio(
  parcial: Partial<IHistorialIARepositorio> = {},
): IHistorialIARepositorio {
  return {
    guardarConsulta: vi.fn(async () => {}),
    listarConsultas: vi.fn(async () => []),
    guardarAnalisis: vi.fn(async () => {}),
    listarAnalisis: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockCuentaConectadaRepositorio(
  parcial: Partial<ICuentaConectadaRepositorio> = {},
): ICuentaConectadaRepositorio {
  return {
    obtener: vi.fn(async () => null),
    guardar: vi.fn(async (c: CuentaConectada) => c),
    eliminar: vi.fn(async () => {}),
    ...parcial,
  };
}

export function cuentaConectadaEjemplo(
  cambios: Partial<Parameters<typeof CuentaConectada.crear>[0]> = {},
  id = "cta-1",
): CuentaConectada {
  return CuentaConectada.crear(
    {
      proveedor: "GOOGLE",
      emailCuenta: "pro@gmail.com",
      accessToken: "access-x",
      refreshToken: "refresh-x",
      scopes: ["https://www.googleapis.com/auth/gmail.send"],
      expiraEn: null,
      ...cambios,
    },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
}

export function mockRecordatorioWhatsappRepositorio(
  parcial: Partial<IRecordatorioWhatsappRepositorio> = {},
): IRecordatorioWhatsappRepositorio {
  return {
    registrar: vi.fn(async (r: RecordatorioWhatsapp) => r),
    actualizar: vi.fn(async (r: RecordatorioWhatsapp) => r),
    obtenerPorId: vi.fn(async () => null),
    obtenerPorIdExterno: vi.fn(async () => null),
    ultimosPorTurnos: vi.fn(async () => new Map<string, RecordatorioWhatsapp>()),
    ...parcial,
  };
}

export function mockMensajeWhatsappRepositorio(
  parcial: Partial<IMensajeWhatsappRepositorio> = {},
): IMensajeWhatsappRepositorio {
  return {
    crear: vi.fn(async (m: MensajeWhatsapp) => m),
    actualizar: vi.fn(async (m: MensajeWhatsapp) => m),
    obtenerPorIdExterno: vi.fn(async () => null),
    listarPorPaciente: vi.fn(async () => []),
    ultimoEntrante: vi.fn(async () => null),
    ...parcial,
  };
}

export function mockProveedorWhatsapp(
  parcial: Partial<IProveedorWhatsapp> = {},
): IProveedorWhatsapp {
  return {
    modoActual: vi.fn(async () => "ENLACE" as const),
    preparar: vi.fn(async (m) => ({
      modo: "ENLACE" as const,
      enlace: `https://wa.me/${m.telefono}`,
    })),
    ...parcial,
  };
}

export function recordatorioWhatsappEjemplo(
  cambios: Partial<Parameters<typeof RecordatorioWhatsapp.crear>[0]> = {},
  id = "rec-1",
): RecordatorioWhatsapp {
  return RecordatorioWhatsapp.crear(
    {
      turnoId: "tur-1",
      pacienteId: "pac-1",
      telefono: "5491155554444",
      mensaje: "Te recuerdo tu turno.",
      usuarioId: "usr-1",
      ...cambios,
    },
    id,
    new Date("2026-08-24T12:00:00Z"),
  );
}

export function mockNutricionistaRepositorio(
  parcial: Partial<INutricionistaRepositorio> = {},
): INutricionistaRepositorio {
  return {
    crear: vi.fn(async () => {}),
    existe: vi.fn(async () => true),
    ...parcial,
  };
}

export function mockConfiguracionRepositorio(
  parcial: Partial<IConfiguracionRepositorio> = {},
): IConfiguracionRepositorio {
  return {
    obtener: vi.fn(async () => null),
    guardar: vi.fn(async (c: ConfiguracionConsultorio) => c),
    ...parcial,
  };
}

export function mockAxiomaRepositorio(
  parcial: Partial<IAxiomaRepositorio> = {},
): IAxiomaRepositorio {
  return {
    crear: vi.fn(async (a: AxiomaNutricional) => a),
    actualizar: vi.fn(async (a: AxiomaNutricional) => a),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    listar: vi.fn(async () => []),
    listarActivos: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockAlimentoPropioRepositorio(
  parcial: Partial<IAlimentoPropioRepositorio> = {},
): IAlimentoPropioRepositorio {
  return {
    reemplazarTodos: vi.fn(async (a) => a.length),
    buscar: vi.fn(async () => []),
    contar: vi.fn(async () => 0),
    vaciar: vi.fn(async () => {}),
    ...parcial,
  };
}

export function mockAsistenteAnalitico(
  parcial: Partial<IAsistenteAnalitico> = {},
): IAsistenteAnalitico {
  return {
    responder: vi.fn(async () => "respuesta analítica de demostración"),
    ...parcial,
  };
}

export function mockRetroalimentacionInsightRepositorio(
  parcial: Partial<IRetroalimentacionInsightRepositorio> = {},
): IRetroalimentacionInsightRepositorio {
  return {
    registrar: vi.fn(async () => {}),
    ...parcial,
  };
}

export function mockAsistenteNutricional(
  parcial: Partial<IAsistenteNutricional> = {},
): IAsistenteNutricional {
  return {
    responder: vi.fn(async () => "respuesta de demostración"),
    ...parcial,
  };
}

export function mockAnalisisComidaIA(
  parcial: Partial<IAnalisisComidaIA> = {},
): IAnalisisComidaIA {
  return {
    analizar: vi.fn(async () => ({
      descripcion: "plato demo",
      porcionEstimada: "1 plato",
      calorias: 500,
      proteinasG: 30,
      carbohidratosG: 40,
      grasasG: 20,
      confianza: 0.4,
      nota: "demo",
    })),
    ...parcial,
  };
}

export function mockAnalisisPredictivo(
  parcial: Partial<IAnalisisPredictivo> = {},
): IAnalisisPredictivo {
  return {
    insights: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockServicioEmail(parcial: Partial<IServicioEmail> = {}): IServicioEmail {
  return {
    enviar: vi.fn(async () => {}),
    ...parcial,
  };
}

export function mockColaTrabajos(parcial: Partial<IColaTrabajos> = {}): IColaTrabajos {
  return {
    encolar: vi.fn(async () => {}),
    ...parcial,
  };
}

export function mockReloj(fecha = new Date("2026-07-14T12:00:00Z")): IRelojFecha {
  return {
    ahora: vi.fn(() => fecha),
    hoy: vi.fn(
      () =>
        new Date(
          Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
        ),
    ),
  };
}

// --- Fábricas de entidades de ejemplo ---------------------------------------

export function pacienteEjemplo(cambios: Partial<DatosNuevoPaciente> = {}, id = "pac-1"): Paciente {
  return Paciente.crear(
    {
      nombre: "Ana",
      apellido: "García",
      email: "ana@mail.com",
      telefono: null,
      fechaNacimiento: null,
      notas: null,
      ...cambios,
    },
    id,
  );
}

export function usuarioEjemplo(cambios: Partial<DatosNuevoUsuario> = {}, id = "usr-1"): Usuario {
  return Usuario.crear(
    {
      email: "nutri@mail.com",
      passwordHash: "hash:vieja",
      rol: "NUTRICIONISTA",
      nutricionistaId: id,
      ...cambios,
    },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
}

export function turnoEjemplo(cambios: Partial<DatosNuevoTurno> = {}, id = "tur-1"): Turno {
  return Turno.crear(
    {
      pacienteId: "pac-1",
      fecha: new Date("2026-07-01"),
      hora: "10:00",
      duracionMinutos: 30,
      notas: null,
      ...cambios,
    },
    id,
  );
}

export function archivoEjemplo(
  cambios: Partial<DatosNuevoArchivo> = {},
  id = "arc-1",
): Archivo {
  return Archivo.crear(
    {
      nombreOriginal: "analisis.pdf",
      mimeType: "application/pdf",
      tamanoBytes: 1024,
      contexto: "laboratorio",
      ...cambios,
    },
    id,
  );
}

export function historiaClinicaEjemplo(
  cambios: Partial<DatosHistoriaClinica> = {},
  id = "his-1",
): HistoriaClinica {
  return HistoriaClinica.crear(
    {
      pacienteId: "pac-1",
      motivoConsulta: "Descenso de peso",
      ...cambios,
    },
    id,
  );
}

export function objetivoComposicionEjemplo(
  cambios: Partial<DatosObjetivoComposicion> = {},
  id = "obj-comp-1",
): ObjetivoComposicion {
  return ObjetivoComposicion.crear(
    {
      pacienteId: "pac-1",
      variable: "MASA_ADIPOSA_KG",
      valorObjetivo: 15,
      fechaObjetivo: null,
      ...cambios,
    },
    id,
  );
}

export function antropometriaEjemplo(
  cambios: Partial<DatosNuevaAntropometria> = {},
  id = "ant-1",
): Antropometria {
  return Antropometria.crear(
    {
      pacienteId: "pac-1",
      fecha: new Date("2026-07-01"),
      pesoKg: 80,
      pliegueTricipital: 10,
      pliegueSubescapular: 15,
      pliegueSupraespinal: 12,
      pliegueAbdominal: 20,
      pliegueMuslo: 16,
      plieguePantorrilla: 11,
      ...cambios,
    },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
}

export function alertaAlimentariaEjemplo(
  cambios: Partial<DatosNuevaAlertaAlimentaria> = {},
  id = "ale-1",
): AlertaAlimentaria {
  return AlertaAlimentaria.crear(
    {
      pacienteId: "pac-1",
      tipo: "INTOLERANCIA",
      descripcion: "Lactosa",
      ...cambios,
    },
    id,
  );
}

export function laboratorioEjemplo(
  cambios: Partial<DatosNuevoLaboratorio> = {},
  id = "lab-1",
): Laboratorio {
  return Laboratorio.crear(
    {
      pacienteId: "pac-1",
      fecha: new Date("2026-07-01"),
      titulo: "Perfil lipídico",
      ...cambios,
    },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
}

export function registroDiarioEjemplo(
  cambios: Partial<DatosDia> = {},
  id = "reg-1",
): RegistroDiario {
  return RegistroDiario.crear(
    {
      pacienteId: "pac-1",
      fecha: new Date("2026-07-10"),
      pesoKg: 78.5,
      aguaMl: 1500,
      ...cambios,
    },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
}

export function planEjemplo(
  cambios: Partial<DatosNuevoPlan> = {},
  id = "pla-1",
): PlanNutricional {
  let contador = 0;
  return PlanNutricional.crear(
    {
      nombre: "Plan descenso",
      esPlantilla: false,
      caloriasMeta: 2000,
      comidas: [
        {
          nombre: "Desayuno",
          horaDesde: "08:00",
          opciones: [
            { contenido: "Café con leche + tostadas" },
            { contenido: "Yogur con granola" },
          ],
        },
      ],
      equivalencias: [{ titulo: "1 fruta", detalle: "1 manzana o 1 banana chica" }],
      recomendaciones: [{ tipo: "NUTRICIONAL", texto: "Tomar 2 L de agua por día." }],
      ...cambios,
    },
    id,
    () => `hijo-${++contador}`,
    new Date("2026-07-14T12:00:00Z"),
  );
}

export function objetivoEjemplo(
  cambios: Partial<DatosNuevoObjetivo> = {},
  id = "obj-1",
): Objetivo {
  return Objetivo.crear(
    {
      pacienteId: "pac-1",
      titulo: "Bajar 5 kg",
      prioridad: "ALTA",
      fechaObjetivo: new Date("2026-10-01"),
      ...cambios,
    },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
}

export function perfilDeportivoEjemplo(
  cambios: Partial<DatosPerfilDeportivo> = {},
  id = "dep-1",
): PerfilDeportivo {
  return PerfilDeportivo.crear(
    {
      pacienteId: "pac-1",
      deporte: "Atletismo",
      disciplina: "Maratón",
      nivel: "COMPETITIVO",
      fase: "COMPETENCIA",
      diasEntrenamientoSemana: 6,
      ...cambios,
    },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
}

export function competenciaEjemplo(
  cambios: Partial<DatosCompetencia> = {},
  id = "com-1",
): Competencia {
  return Competencia.crear(
    {
      pacienteId: "pac-1",
      nombre: "Maratón de Buenos Aires",
      fecha: new Date("2026-09-20"),
      importancia: "A",
      ...cambios,
    },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
}

export function materialEjemplo(
  cambios: Partial<DatosNuevoMaterial> = {},
  id = "mat-1",
): MaterialBiblioteca {
  return MaterialBiblioteca.crear(
    {
      tipo: "ENLACE",
      titulo: "Guía de porciones",
      url: "https://ejemplo.com/guia",
      categoria: "educación",
      ...cambios,
    },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
}

export function suplementoEjemplo(
  cambios: Partial<DatosNuevoSuplemento> = {},
  id = "sup-1",
): Suplemento {
  return Suplemento.crear(
    {
      pacienteId: "pac-1",
      nombre: "Creatina monohidrato",
      dosis: "5 g",
      frecuencia: "todos los días",
      ...cambios,
    },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
}

export function alertaSeguimientoEjemplo(
  cambios: Partial<DatosNuevaAlertaSeguimiento> = {},
  id = "als-1",
): AlertaSeguimiento {
  return AlertaSeguimiento.crear(
    {
      pacienteId: "pac-1",
      tipo: "SIN_REGISTRO_PESO",
      detalle: "Ana García no registra su peso hace 7 días.",
      ...cambios,
    },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
}

export function recetaEjemplo(cambios: Partial<DatosNuevaReceta> = {}, id = "rec-1"): Receta {
  return Receta.crear(
    {
      nombre: "Tortilla de espinaca",
      porciones: 2,
      preparacion: "Batir, cocinar, servir.",
      ingredientes: [
        {
          nombre: "Huevo",
          cantidadGramos: 100,
          caloriasPor100: 155,
          proteinasPor100: 13,
          carbohidratosPor100: 1.1,
          grasasPor100: 11,
        },
        {
          nombre: "Espinaca",
          cantidadGramos: 50,
          caloriasPor100: 23,
          proteinasPor100: 2.9,
          carbohidratosPor100: 3.6,
          grasasPor100: 0.4,
        },
      ],
      etiquetas: ["vegetariano"],
      ...cambios,
    },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
}

export function metricaEjemplo(
  cambios: Partial<DatosMetricaDispositivo> = {},
  id = "met-1",
): MetricaDispositivo {
  return MetricaDispositivo.crear(
    {
      pacienteId: "pac-1",
      fecha: new Date("2026-07-10"),
      fuente: "APPLE_WATCH",
      pasos: 8000,
      minutosActividad: 40,
      horasSueno: 7.5,
      ...cambios,
    },
    id,
    new Date("2026-07-10T12:00:00Z"),
  );
}

export function conversacionEjemplo(pacienteId = "pac-1", id = "conv-1"): Conversacion {
  return Conversacion.crear(pacienteId, id, new Date("2026-07-14T12:00:00Z"));
}

export function mensajeEjemplo(
  cambios: Partial<DatosNuevoMensaje> = {},
  id = "msj-1",
): Mensaje {
  return Mensaje.crear(
    {
      conversacionId: "conv-1",
      autorId: "usr-nutri",
      cuerpo: "Hola, ¿cómo venís con el plan?",
      ...cambios,
    },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
}

export function plantillaEmailEjemplo(
  cambios: Partial<DatosNuevaPlantilla> = {},
  id = "pla-1",
): PlantillaEmail {
  return PlantillaEmail.crear(
    {
      clave: "RECORDATORIO_TURNO",
      nombre: "Recordatorio de turno",
      asunto: "Recordatorio de tu turno del {{fecha}}",
      cuerpoHtml: "<p>Hola {{paciente}}, te esperamos el {{fecha}} a las {{hora}}.</p>",
      deSistema: true,
      ...cambios,
    },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
}

export function configuracionEjemplo(): ConfiguracionConsultorio {
  return ConfiguracionConsultorio.porDefecto(new Date("2026-07-14T12:00:00Z"));
}

export function axiomaEjemplo(
  cambios: Partial<DatosNuevoAxioma> = {},
  id = "axi-1",
): AxiomaNutricional {
  return AxiomaNutricional.crear(
    {
      ambito: "SUENO",
      parametro: "horasSueno",
      operador: "MAYOR_IGUAL",
      valor: 7,
      unidad: "h",
      texto: "Dormir al menos 7 horas favorece la recuperación.",
      ...cambios,
    },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
}
