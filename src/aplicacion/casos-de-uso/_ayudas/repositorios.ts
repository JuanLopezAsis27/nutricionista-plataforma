import { vi } from "vitest";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ITokenRecuperacionRepositorio } from "@/dominio/repositorios/ITokenRecuperacionRepositorio";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IHistoriaClinicaRepositorio } from "@/dominio/repositorios/IHistoriaClinicaRepositorio";
import type { ICampoHistoriaClinicaRepositorio } from "@/dominio/repositorios/ICampoHistoriaClinicaRepositorio";
import type { IConversacionIARepositorio } from "@/dominio/repositorios/IConversacionIARepositorio";
import type { IAntropometriaRepositorio } from "@/dominio/repositorios/IAntropometriaRepositorio";
import type { IObjetivoComposicionRepositorio } from "@/dominio/repositorios/IObjetivoComposicionRepositorio";
import type { IPlantillaAntropometricaRepositorio } from "@/dominio/repositorios/IPlantillaAntropometricaRepositorio";
import type { IAlertaAlimentariaRepositorio } from "@/dominio/repositorios/IAlertaAlimentariaRepositorio";
import type { ILaboratorioRepositorio } from "@/dominio/repositorios/ILaboratorioRepositorio";
import type { IRegistroDiarioRepositorio } from "@/dominio/repositorios/IRegistroDiarioRepositorio";
import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { IMetricaDispositivoRepositorio } from "@/dominio/repositorios/IMetricaDispositivoRepositorio";
import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type { IPlanRepositorio } from "@/dominio/repositorios/IPlanRepositorio";
import type { IGrupoPlanRepositorio } from "@/dominio/repositorios/IGrupoPlanRepositorio";
import type { IGrupoRecetaRepositorio } from "@/dominio/repositorios/IGrupoRecetaRepositorio";
import type { IGrabacionConsultaRepositorio } from "@/dominio/repositorios/IGrabacionConsultaRepositorio";
import type { IObjetivoRepositorio } from "@/dominio/repositorios/IObjetivoRepositorio";
import type { IPerfilDeportivoRepositorio } from "@/dominio/repositorios/IPerfilDeportivoRepositorio";
import type { ICompetenciaRepositorio } from "@/dominio/repositorios/ICompetenciaRepositorio";
import type { IMaterialRepositorio } from "@/dominio/repositorios/IMaterialRepositorio";
import type { ISuplementoRepositorio } from "@/dominio/repositorios/ISuplementoRepositorio";
import type { IAlertaSeguimientoRepositorio } from "@/dominio/repositorios/IAlertaSeguimientoRepositorio";
import type { IPlantillaEmailRepositorio } from "@/dominio/repositorios/IPlantillaEmailRepositorio";
import type { IEmailEnviadoRepositorio } from "@/dominio/repositorios/IEmailEnviadoRepositorio";
import type { IEstadisticasRepositorio } from "@/dominio/repositorios/IEstadisticasRepositorio";
import type { IMensajeriaRepositorio } from "@/dominio/repositorios/IMensajeriaRepositorio";
import type { IHistorialIARepositorio } from "@/dominio/repositorios/IHistorialIARepositorio";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { IPlantillaWhatsappRepositorio } from "@/dominio/repositorios/IPlantillaWhatsappRepositorio";
import type { IConfiguracionRecordatoriosRepositorio } from "@/dominio/repositorios/IConfiguracionRecordatoriosRepositorio";
import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";
import type { IRecordatorioWhatsappRepositorio } from "@/dominio/repositorios/IRecordatorioWhatsappRepositorio";
import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import { MensajeWhatsapp } from "@/dominio/entidades/MensajeWhatsapp";
import { PlantillaAntropometrica } from "@/dominio/entidades/PlantillaAntropometrica";
import { RecordatorioWhatsapp } from "@/dominio/entidades/RecordatorioWhatsapp";
import type { IAxiomaRepositorio } from "@/dominio/repositorios/IAxiomaRepositorio";
import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import type { IRetroalimentacionInsightRepositorio } from "@/dominio/repositorios/IRetroalimentacionInsightRepositorio";
import type { ICuentaConectadaRepositorio } from "@/dominio/repositorios/ICuentaConectadaRepositorio";
import { Paciente } from "@/dominio/entidades/Paciente";
import { ObjetivoComposicion } from "@/dominio/entidades/ObjetivoComposicion";
import { Turno } from "@/dominio/entidades/Turno";
import { Usuario } from "@/dominio/entidades/Usuario";
import { TokenRecuperacion } from "@/dominio/entidades/TokenRecuperacion";
import { Archivo } from "@/dominio/entidades/Archivo";
import { HistoriaClinica } from "@/dominio/entidades/HistoriaClinica";
import type { CampoHistoriaClinica } from "@/dominio/entidades/CampoHistoriaClinica";
import { Antropometria } from "@/dominio/entidades/Antropometria";
import { AlertaAlimentaria } from "@/dominio/entidades/AlertaAlimentaria";
import { Laboratorio } from "@/dominio/entidades/Laboratorio";
import { RegistroDiario } from "@/dominio/entidades/RegistroDiario";
import { Receta } from "@/dominio/entidades/Receta";
import { PlanNutricional } from "@/dominio/entidades/PlanNutricional";
import { Objetivo } from "@/dominio/entidades/Objetivo";
import { PerfilDeportivo } from "@/dominio/entidades/PerfilDeportivo";
import { Competencia } from "@/dominio/entidades/Competencia";
import { MaterialBiblioteca } from "@/dominio/entidades/MaterialBiblioteca";
import { Suplemento } from "@/dominio/entidades/Suplemento";
import { AlertaSeguimiento } from "@/dominio/entidades/AlertaSeguimiento";
import { PlantillaEmail } from "@/dominio/entidades/PlantillaEmail";
import { Conversacion } from "@/dominio/entidades/Conversacion";
import { Mensaje } from "@/dominio/entidades/Mensaje";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import { GrupoPlan } from "@/dominio/entidades/GrupoPlan";
import { GrupoReceta } from "@/dominio/entidades/GrupoReceta";
import type { GrabacionConsulta } from "@/dominio/entidades/GrabacionConsulta";
import type { ResumenConsulta } from "@/dominio/entidades/ResumenConsulta";
import { ConfiguracionRecordatorios } from "@/dominio/entidades/ConfiguracionRecordatorios";
import { PlantillaWhatsapp } from "@/dominio/entidades/PlantillaWhatsapp";
import { AxiomaNutricional } from "@/dominio/entidades/AxiomaNutricional";
import { CuentaConectada } from "@/dominio/entidades/CuentaConectada";

/**
 * Ayudas para los tests de casos de uso.
 *
 * Provee constructores de repositorios mock que implementan las interfaces
 * del dominio (nunca dependen de Prisma) y fábricas de entidades de ejemplo.
 * No es un archivo de test (no contiene `describe`).
 */

import { plantillaWhatsappEjemplo } from "./entidades";

/**
 * Mocks de los repositorios del dominio.
 *
 * Cada uno devuelve una implementación completa de su puerto con `vi.fn()` en
 * todos los métodos, y acepta un parcial para sobrescribir solo lo que el test
 * necesita. Ese parcial es lo que mantiene los tests legibles: se ve de un
 * vistazo qué respuesta del repositorio está montando el escenario.
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
    eliminar: vi.fn(async () => {}),
    obtenerEnFecha: vi.fn(async () => []),
    listarEntreFechas: vi.fn(async () => []),
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

export function mockHistoriaClinicaRepositorio(
  parcial: Partial<IHistoriaClinicaRepositorio> = {},
): IHistoriaClinicaRepositorio {
  return {
    guardar: vi.fn(async (h: HistoriaClinica) => h),
    obtenerPorPaciente: vi.fn(async () => null),
    ...parcial,
  };
}

export function mockConversacionIARepositorio(
  parcial: Partial<IConversacionIARepositorio> = {},
): IConversacionIARepositorio {
  return {
    crear: vi.fn(async () => {}),
    agregarMensaje: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    listar: vi.fn(async () => []),
    eliminar: vi.fn(async () => {}),
    ...parcial,
  };
}

export function mockCampoHistoriaClinicaRepositorio(
  parcial: Partial<ICampoHistoriaClinicaRepositorio> = {},
): ICampoHistoriaClinicaRepositorio {
  return {
    obtenerTodos: vi.fn(async () => []),
    obtenerPorId: vi.fn(async () => null),
    obtenerPorNombre: vi.fn(async () => null),
    crear: vi.fn(async (c: CampoHistoriaClinica) => c),
    actualizar: vi.fn(async (c: CampoHistoriaClinica) => c),
    eliminar: vi.fn(async () => {}),
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

export function mockPlantillaAntropometricaRepositorio(
  parcial: Partial<IPlantillaAntropometricaRepositorio> = {},
): IPlantillaAntropometricaRepositorio {
  return {
    guardar: vi.fn(async (p: PlantillaAntropometrica) => p),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    listar: vi.fn(async () => []),
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
    moverAGrupo: vi.fn(async () => {}),
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

export function mockGrupoPlanRepositorio(
  parcial: Partial<IGrupoPlanRepositorio> = {},
): IGrupoPlanRepositorio {
  return {
    crear: vi.fn(async (g: GrupoPlan) => g),
    actualizar: vi.fn(async (g: GrupoPlan) => g),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    listar: vi.fn(async () => []),
    existeNombre: vi.fn(async () => false),
    ...parcial,
  };
}

export function mockGrupoRecetaRepositorio(
  parcial: Partial<IGrupoRecetaRepositorio> = {},
): IGrupoRecetaRepositorio {
  return {
    crear: vi.fn(async (g: GrupoReceta) => g),
    actualizar: vi.fn(async (g: GrupoReceta) => g),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    listar: vi.fn(async () => []),
    existeNombre: vi.fn(async () => false),
    ...parcial,
  };
}

export function mockGrabacionRepositorio(
  parcial: Partial<IGrabacionConsultaRepositorio> = {},
): IGrabacionConsultaRepositorio {
  return {
    crear: vi.fn(async (g: GrabacionConsulta) => g),
    guardar: vi.fn(async (g: GrabacionConsulta) => g),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    listarPorTurno: vi.fn(async () => []),
    siguienteOrden: vi.fn(async () => 1),
    obtenerInquilinoGlobal: vi.fn(async () => null),
    listarPendientesGlobal: vi.fn(async () => []),
    obtenerResumen: vi.fn(async () => null),
    guardarResumen: vi.fn(async (r: ResumenConsulta) => r),
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
    moverAGrupo: vi.fn(async () => {}),
    existeNombre: vi.fn(async () => false),
    ...parcial,
  };
}

/**
 * Mock del puerto de asignaciones plan⇄paciente.
 *
 * Separado de `mockPlanRepositorio` desde que el puerto se partió en dos: un
 * test de asignaciones ya no tiene que construir los nueve métodos del plan
 * para ejercitar uno del historial.
 */
export function mockAsignacionPlanRepositorio(
  parcial: Partial<IAsignacionPlanRepositorio> = {},
): IAsignacionPlanRepositorio {
  return {
    asignarAPaciente: vi.fn(async (a) => a),
    desactivarAsignacionesDe: vi.fn(async () => {}),
    obtenerAsignacionActiva: vi.fn(async () => null),
    listarAsignacionesDePlan: vi.fn(async () => []),
    listarAsignacionesDePaciente: vi.fn(async () => []),
    obtenerPlanActivoDePaciente: vi.fn(async () => null),
    listarAsignacionesActivasVencidas: vi.fn(async () => []),
    contarAsignacionesActivasDePlan: vi.fn(async () => 0),
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
    ultimoEnviadoParaTurno: vi.fn(async () => null),
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
      turnosPorEstado: {
        PENDIENTE: 0,
        CONFIRMADO: 0,
        CANCELADO: 0,
        COMPLETADO: 0,
      },
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

export function mockRecordatorioWhatsappRepositorio(
  parcial: Partial<IRecordatorioWhatsappRepositorio> = {},
): IRecordatorioWhatsappRepositorio {
  return {
    registrar: vi.fn(async (r: RecordatorioWhatsapp) => r),
    actualizar: vi.fn(async (r: RecordatorioWhatsapp) => r),
    obtenerPorId: vi.fn(async () => null),
    obtenerPorIdExterno: vi.fn(async () => null),
    obtenerPorTurnoYDias: vi.fn(async () => null),
    porTurnos: vi.fn(async () => new Map<string, RecordatorioWhatsapp[]>()),
    pendientesDeConfirmar: vi.fn(async () => []),
    listar: vi.fn(async () => []),
    sinRespuestaDePaciente: vi.fn(async () => []),
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
    ultimosPorPacientes: vi.fn(async () => new Map<string, MensajeWhatsapp>()),
    ultimosEntrantesPorPacientes: vi.fn(
      async () => new Map<string, MensajeWhatsapp>(),
    ),
    ...parcial,
  };
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

export function mockPlantillaWhatsappRepositorio(
  parcial: Partial<IPlantillaWhatsappRepositorio> = {},
): IPlantillaWhatsappRepositorio {
  return {
    listar: vi.fn(async () => []),
    obtenerPorId: vi.fn(async () => null),
    obtenerPredeterminada: vi.fn(async () => plantillaWhatsappEjemplo()),
    crear: vi.fn(async (p: PlantillaWhatsapp) => p),
    actualizar: vi.fn(async (p: PlantillaWhatsapp) => p),
    eliminar: vi.fn(async () => {}),
    ...parcial,
  };
}

export function mockConfiguracionRecordatoriosRepositorio(
  parcial: Partial<IConfiguracionRecordatoriosRepositorio> = {},
): IConfiguracionRecordatoriosRepositorio {
  return {
    obtener: vi.fn(async () => null),
    guardar: vi.fn(async (c: ConfiguracionRecordatorios) => c),
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

export function mockRetroalimentacionInsightRepositorio(
  parcial: Partial<IRetroalimentacionInsightRepositorio> = {},
): IRetroalimentacionInsightRepositorio {
  return {
    registrar: vi.fn(async () => {}),
    ...parcial,
  };
}
