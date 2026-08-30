import { vi } from "vitest";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ITokenRecuperacionRepositorio } from "@/dominio/repositorios/ITokenRecuperacionRepositorio";
import type { IGeneradorTokens } from "@/dominio/servicios/IGeneradorTokens";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IHistoriaClinicaRepositorio } from "@/dominio/repositorios/IHistoriaClinicaRepositorio";
import type { IAntropometriaRepositorio } from "@/dominio/repositorios/IAntropometriaRepositorio";
import type { IObjetivoComposicionRepositorio } from "@/dominio/repositorios/IObjetivoComposicionRepositorio";
import type { IPlantillaAntropometricaRepositorio } from "@/dominio/repositorios/IPlantillaAntropometricaRepositorio";
import type { IAlertaAlimentariaRepositorio } from "@/dominio/repositorios/IAlertaAlimentariaRepositorio";
import type { ILaboratorioRepositorio } from "@/dominio/repositorios/ILaboratorioRepositorio";
import type { IRegistroDiarioRepositorio } from "@/dominio/repositorios/IRegistroDiarioRepositorio";
import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { IMetricaDispositivoRepositorio } from "@/dominio/repositorios/IMetricaDispositivoRepositorio";
import type { IPlanRepositorio } from "@/dominio/repositorios/IPlanRepositorio";
import type { IGrupoPlanRepositorio } from "@/dominio/repositorios/IGrupoPlanRepositorio";
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
import type { IProveedorWhatsapp } from "@/dominio/servicios/IProveedorWhatsapp";
import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import { MensajeWhatsapp } from "@/dominio/entidades/MensajeWhatsapp";
import {
  PlantillaAntropometrica,
  type DatosPlantillaAntropometrica,
} from "@/dominio/entidades/PlantillaAntropometrica";
import { RecordatorioWhatsapp } from "@/dominio/entidades/RecordatorioWhatsapp";
import type { IAxiomaRepositorio } from "@/dominio/repositorios/IAxiomaRepositorio";
import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import type { IAsistenteAnalitico } from "@/dominio/servicios/IAsistenteAnalitico";
import type { IRetroalimentacionInsightRepositorio } from "@/dominio/repositorios/IRetroalimentacionInsightRepositorio";
import type { ICuentaConectadaRepositorio } from "@/dominio/repositorios/ICuentaConectadaRepositorio";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IColaTrabajos } from "@/dominio/servicios/IColaTrabajos";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import type { IAsistenteNutricional } from "@/dominio/servicios/IAsistenteNutricional";
import type { IAnalisisComidaIA } from "@/dominio/servicios/IAnalisisComidaIA";
import type { IAnalisisPredictivo } from "@/dominio/servicios/IAnalisisPredictivo";
import {
  Paciente,
  type DatosNuevoPaciente,
} from "@/dominio/entidades/Paciente";
import {
  ObjetivoComposicion,
  type DatosObjetivoComposicion,
} from "@/dominio/entidades/ObjetivoComposicion";
import { Turno, type DatosNuevoTurno } from "@/dominio/entidades/Turno";
import { Usuario, type DatosNuevoUsuario } from "@/dominio/entidades/Usuario";
import { TokenRecuperacion } from "@/dominio/entidades/TokenRecuperacion";
import { Archivo, type DatosNuevoArchivo } from "@/dominio/entidades/Archivo";
import {
  HistoriaClinica,
  type DatosHistoriaClinica,
} from "@/dominio/entidades/HistoriaClinica";
import {
  Antropometria,
  type DatosNuevaAntropometria,
} from "@/dominio/entidades/Antropometria";
import {
  AlertaAlimentaria,
  type DatosNuevaAlertaAlimentaria,
} from "@/dominio/entidades/AlertaAlimentaria";
import {
  Laboratorio,
  type DatosNuevoLaboratorio,
} from "@/dominio/entidades/Laboratorio";
import {
  RegistroDiario,
  type DatosDia,
} from "@/dominio/entidades/RegistroDiario";
import { Receta, type DatosNuevaReceta } from "@/dominio/entidades/Receta";
import {
  MetricaDispositivo,
  type DatosMetricaDispositivo,
} from "@/dominio/entidades/MetricaDispositivo";
import {
  PlanNutricional,
  type DatosNuevoPlan,
} from "@/dominio/entidades/PlanNutricional";
import {
  Objetivo,
  type DatosNuevoObjetivo,
} from "@/dominio/entidades/Objetivo";
import {
  PerfilDeportivo,
  type DatosPerfilDeportivo,
} from "@/dominio/entidades/PerfilDeportivo";
import {
  Competencia,
  type DatosCompetencia,
} from "@/dominio/entidades/Competencia";
import {
  MaterialBiblioteca,
  type DatosNuevoMaterial,
} from "@/dominio/entidades/MaterialBiblioteca";
import {
  Suplemento,
  type DatosNuevoSuplemento,
} from "@/dominio/entidades/Suplemento";
import {
  AlertaSeguimiento,
  type DatosNuevaAlertaSeguimiento,
} from "@/dominio/entidades/AlertaSeguimiento";
import {
  PlantillaEmail,
  type DatosNuevaPlantilla,
} from "@/dominio/entidades/PlantillaEmail";
import { Conversacion } from "@/dominio/entidades/Conversacion";
import { Mensaje, type DatosNuevoMensaje } from "@/dominio/entidades/Mensaje";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import { GrupoPlan } from "@/dominio/entidades/GrupoPlan";
import { ConfiguracionRecordatorios } from "@/dominio/entidades/ConfiguracionRecordatorios";
import {
  PlantillaWhatsapp,
  type DatosPlantillaWhatsapp,
  CUERPO_RECORDATORIO_POR_DEFECTO,
} from "@/dominio/entidades/PlantillaWhatsapp";
import {
  AxiomaNutricional,
  type DatosNuevoAxioma,
} from "@/dominio/entidades/AxiomaNutricional";
import { CuentaConectada } from "@/dominio/entidades/CuentaConectada";

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

export function mockGeneradorTokens(
  parcial: Partial<IGeneradorTokens> = {},
): IGeneradorTokens {
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
    verificar: vi.fn(
      async (plano: string, hash: string) => hash === `hash:${plano}`,
    ),
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
    generarUrlLectura: vi.fn(
      async (clave: string) => `https://bucket.local/${clave}?firma`,
    ),
    descargar: vi.fn(async () => new Uint8Array([37, 80, 68, 70])), // "%PDF"
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

/**
 * Plantilla de carga con los cuatro pliegues de Faulkner.
 *
 * No es un capricho del ejemplo: la entidad RECHAZA una plantilla que no
 * alcance para calcular nada, y Faulkner es el piso -tricipital,
 * subescapular, supraespinal y abdominal-.
 */
export function plantillaAntropometricaEjemplo(
  cambios: Partial<DatosPlantillaAntropometrica> = {},
  id = "plant-antro-1",
): PlantillaAntropometrica {
  return PlantillaAntropometrica.crear(
    {
      nombre: "ISAK reducido",
      descripcion: null,
      campos: [
        "tallaCm",
        "pliegueTricipital",
        "pliegueSubescapular",
        "pliegueSupraespinal",
        "pliegueAbdominal",
      ],
      ...cambios,
    },
    id,
    new Date("2026-01-01T00:00:00.000Z"),
  );
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

export function grupoPlanEjemplo(
  cambios: Partial<{ nombre: string; descripcion: string | null }> = {},
  id = "gru-1",
): GrupoPlan {
  return GrupoPlan.crear(
    { nombre: "Julia Pérez", descripcion: null, ...cambios },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
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
    contarAsignacionesActivasDePlan: vi.fn(async () => 0),
    existeNombre: vi.fn(async () => false),
    listarAsignacionesDePlan: vi.fn(async () => []),
    listarAsignacionesDePaciente: vi.fn(async () => []),
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

export function mockBusEventos(
  parcial: Partial<IBusEventos> = {},
): IBusEventos {
  return {
    publicar: vi.fn(async () => {}),

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

export function mockProveedorWhatsapp(
  parcial: Partial<IProveedorWhatsapp> = {},
): IProveedorWhatsapp {
  return {
    modoActual: vi.fn(async () => "ENLACE" as const),
    preparar: vi.fn(async (m) => ({
      modo: "ENLACE" as const,
      enlace: `https://wa.me/${m.telefono}`,
    })),
    enviarPlantilla: vi.fn(async (e) => ({
      modo: "ENLACE" as const,
      enlace: `https://wa.me/${e.telefono}`,
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

export function mockServicioEmail(
  parcial: Partial<IServicioEmail> = {},
): IServicioEmail {
  return {
    enviar: vi.fn(async () => {}),
    ...parcial,
  };
}

export function mockColaTrabajos(
  parcial: Partial<IColaTrabajos> = {},
): IColaTrabajos {
  return {
    encolar: vi.fn(async () => {}),
    ...parcial,
  };
}

export function mockReloj(
  fecha = new Date("2026-07-14T12:00:00Z"),
): IRelojFecha {
  return {
    ahora: vi.fn(() => fecha),
    hoy: vi.fn(
      () =>
        new Date(
          Date.UTC(
            fecha.getUTCFullYear(),
            fecha.getUTCMonth(),
            fecha.getUTCDate(),
          ),
        ),
    ),
  };
}

// --- Fábricas de entidades de ejemplo ---------------------------------------

export function pacienteEjemplo(
  cambios: Partial<DatosNuevoPaciente> = {},
  id = "pac-1",
): Paciente {
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

export function usuarioEjemplo(
  cambios: Partial<DatosNuevoUsuario> = {},
  id = "usr-1",
): Usuario {
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

export function turnoEjemplo(
  cambios: Partial<DatosNuevoTurno> = {},
  id = "tur-1",
): Turno {
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
  /** Cuándo se planteó: define el punto de partida del progreso. */
  creadoEn = new Date("2020-01-01"),
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
    creadoEn,
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
      equivalencias: [
        { titulo: "1 fruta", detalle: "1 manzana o 1 banana chica" },
      ],
      recomendaciones: [
        { tipo: "NUTRICIONAL", texto: "Tomar 2 L de agua por día." },
      ],
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

export function recetaEjemplo(
  cambios: Partial<DatosNuevaReceta> = {},
  id = "rec-1",
): Receta {
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

export function conversacionEjemplo(
  pacienteId = "pac-1",
  id = "conv-1",
): Conversacion {
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
      cuerpoHtml:
        "<p>Hola {{paciente}}, te esperamos el {{fecha}} a las {{hora}}.</p>",
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

export function configuracionRecordatoriosEjemplo(
  cambios: Partial<
    Parameters<ConfiguracionRecordatorios["actualizar"]>[0]
  > = {},
): ConfiguracionRecordatorios {
  const base = ConfiguracionRecordatorios.porDefecto(
    new Date("2026-07-14T12:00:00Z"),
  );
  return Object.keys(cambios).length === 0
    ? base
    : base.actualizar(cambios, new Date("2026-07-14T12:00:00Z"));
}

export function plantillaWhatsappEjemplo(
  cambios: Partial<DatosPlantillaWhatsapp> = {},
  id = "pla-wa-1",
): PlantillaWhatsapp {
  return PlantillaWhatsapp.crear(
    {
      nombre: "Recordatorio de turno",
      cuerpo: CUERPO_RECORDATORIO_POR_DEFECTO,
      claveMeta: null,
      idiomaMeta: "es_AR",
      variablesMeta: ["paciente", "fecha", "hora", "profesional"],
      predeterminada: true,
      activa: true,
      ...cambios,
    },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
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
