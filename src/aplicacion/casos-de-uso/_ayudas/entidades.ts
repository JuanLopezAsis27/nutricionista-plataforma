import {
  PlantillaAntropometrica,
  type DatosPlantillaAntropometrica,
} from "@/dominio/entidades/PlantillaAntropometrica";
import { RecordatorioWhatsapp } from "@/dominio/entidades/RecordatorioWhatsapp";
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
  PlanSemanal,
  type DatosNuevoPlanSemanal,
} from "@/dominio/entidades/PlanSemanal";
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
import { GrupoReceta } from "@/dominio/entidades/GrupoReceta";
import {
  GrabacionConsulta,
  type DatosNuevaGrabacion,
} from "@/dominio/entidades/GrabacionConsulta";
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

/**
 * Fábricas de entidades de ejemplo.
 *
 * Todas siguen la misma forma —`entidadEjemplo(cambios, id)`— para que un test
 * solo tenga que nombrar lo que le importa del caso. Los valores por defecto
 * son deliberadamente válidos: varias entidades tienen invariantes propias
 * (una plantilla antropométrica que no alcanza para calcular nada se rechaza),
 * así que el ejemplo tiene que pasar por su propio constructor.
 */

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

export function grupoRecetaEjemplo(
  cambios: Partial<{ nombre: string; descripcion: string | null }> = {},
  id = "grec-1",
): GrupoReceta {
  return GrupoReceta.crear(
    { nombre: "Desayunos", descripcion: null, ...cambios },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
}

export function grabacionEjemplo(
  cambios: Partial<DatosNuevaGrabacion> = {},
  id = "gra-1",
): GrabacionConsulta {
  return GrabacionConsulta.crear(
    { turnoId: "tur-1", orden: 1, duracionSegundos: 600, ...cambios },
    id,
    new Date("2026-07-14T12:00:00Z"),
  );
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

/**
 * Plan semanal de ejemplo: dos franjas y el lunes con dos alternativas de
 * almuerzo, que es el caso que distingue la principal de las demás.
 */
export function planSemanalEjemplo(
  cambios: Partial<DatosNuevoPlanSemanal> = {},
  id = "sem-1",
): PlanSemanal {
  let contador = 0;
  return PlanSemanal.crear(
    {
      nombre: "Semana tipo",
      franjas: [
        {
          nombre: "Desayuno",
          horaDesde: "08:00",
          comidas: [
            {
              dia: "LUNES",
              descripcion: "Tostadas con palta y café",
              items: [
                {
                  nombre: "Pan integral",
                  cantidadGramos: 60,
                  caloriasPor100: 250,
                  proteinasPor100: 9,
                },
              ],
            },
          ],
        },
        {
          nombre: "Almuerzo",
          horaDesde: "12:30",
          comidas: [
            {
              dia: "LUNES",
              descripcion: "Carne con verduras",
              items: [
                {
                  nombre: "Carne magra",
                  cantidadGramos: 150,
                  caloriasPor100: 200,
                  proteinasPor100: 26,
                },
              ],
            },
            {
              dia: "LUNES",
              descripcion: "Tarta de verdura (alternativa)",
              items: [
                {
                  nombre: "Tarta de verdura",
                  cantidadGramos: 200,
                  caloriasPor100: 180,
                  proteinasPor100: 7,
                },
              ],
            },
          ],
        },
      ],
      ...cambios,
    },
    id,
    () => `sem-hijo-${++contador}`,
    new Date("2026-07-14T12:00:00Z"),
  );
}
