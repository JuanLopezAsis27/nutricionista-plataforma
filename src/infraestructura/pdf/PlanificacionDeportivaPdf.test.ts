import { describe, it, expect } from "vitest";
import type {
  IngestaSalidaDto,
  PlanificacionSalidaDto,
} from "@/aplicacion/dtos/planificacionDeportiva.dto";
import { renderizarPlanificacionPdf } from "./PlanificacionDeportivaPdf";

/**
 * Prueba de humo del PDF de la planificación deportiva, como la de la
 * medición: no lee el texto (react-pdf lo dibuja como trazos), caza que un
 * campo en null no reviente el render y le dé un 500 a quien lo pide.
 *
 * Los dos extremos: una completa (carrera con todo, ingestas antes y durante,
 * competencia, cafeína por encima de la guía) y una vacía (sin carrera, sin
 * ingestas, sin nada calculado).
 */

const sinMacros = {
  calorias: null,
  proteinasG: null,
  carbohidratosG: null,
  grasasG: null,
};

function ingesta(
  minuto: number,
  tiempo: string,
  datos: Partial<IngestaSalidaDto> = {},
): IngestaSalidaDto {
  return {
    id: `ing-${minuto}`,
    minuto,
    tiempo,
    hora: null,
    km: null,
    kmEstimado: null,
    notas: null,
    alimentos: [],
    macros: sinMacros,
    liquidosMl: null,
    cafeinaMg: null,
    ...datos,
  };
}

const gel = {
  id: "ali-1",
  nombre: "Gel con cafeína",
  cantidadGramos: 40,
  caloriasPor100: 250,
  proteinasPor100: 0,
  carbohidratosPor100: 62,
  grasasPor100: 0,
  cafeinaPor100: 250,
  fuente: null,
  referenciaExterna: null,
  alimentoOrigenId: null,
  unidadBase: "GRAMO" as const,
  medidas: [],
  medida: null,
  cantidadMedida: null,
  cantidadPorMedida: null,
  cantidadTexto: "40 g",
};

const completa: PlanificacionSalidaDto = {
  id: "pd-1",
  nombre: "Ultra de la montaña",
  descripcion: "Primera ultra: priorizar el estómago.",
  tipo: "CARRERA",
  grupoId: null,
  pesoReferenciaKg: 60,
  carrera: {
    modalidad: "TRAIL",
    distanciaKm: 42.2,
    duracionEstimadaMin: 330,
    desnivelPositivoM: 2400,
    desnivelNegativoM: 2400,
    horaLargada: "07:00",
    temperaturaEstimadaC: 12.5,
    carbohidratosObjetivoGH: 60,
    liquidosObjetivoMlH: 500,
    sodioObjetivoMgH: 400,
    puestosAbastecimiento: "Km 12, 25 y 34.",
    estrategiaPrevia: "Carga de carbohidratos 48 h antes.",
    recuperacion: "Batido de recuperación al llegar.",
    ritmoMinPorKm: 7.82,
  },
  ingestas: [
    ingesta(-30, "-0:30", {
      hora: "06:30",
      alimentos: [{ ...gel, id: "ali-0", nombre: "Banana" }],
      macros: { ...sinMacros, carbohidratosG: 25, calorias: 100 },
    }),
    ingesta(0, "0:00", { hora: "07:00" }),
    ingesta(45, "0:45", {
      hora: "07:45",
      km: 6,
      notas: "Con agua del puesto.",
      alimentos: [gel],
      macros: { ...sinMacros, carbohidratosG: 24.8, calorias: 100 },
      liquidosMl: 250,
      cafeinaMg: 100,
    }),
    ingesta(200, "3:20", { kmEstimado: 25.6, alimentos: [gel] }),
  ],
  resumen: {
    durante: {
      cantidad: 3,
      macros: { ...sinMacros, carbohidratosG: 49.6, calorias: 200 },
      liquidosMl: 250,
      porHora: { calorias: 36.4, carbohidratosG: 9, liquidosMl: 45.5 },
    },
    antes: {
      cantidad: 1,
      macros: { ...sinMacros, carbohidratosG: 25, calorias: 100 },
      liquidosMl: null,
    },
    carbohidratos: "DEBAJO",
    liquidos: "DEBAJO",
    intervaloMaximoMin: 155,
    cafeina: {
      antesMg: null,
      duranteMg: 400,
      totalMg: 400,
      porHoraMg: 73,
      mgPorKg: 6.7,
    },
  },
  creadoEn: new Date("2026-07-01T00:00:00Z"),
  actualizadoEn: new Date("2026-07-01T00:00:00Z"),
};

const vacia: PlanificacionSalidaDto = {
  ...completa,
  id: "pd-2",
  nombre: "Sin datos",
  descripcion: null,
  pesoReferenciaKg: null,
  carrera: null,
  ingestas: [],
  resumen: {
    durante: {
      cantidad: 0,
      macros: sinMacros,
      liquidosMl: null,
      porHora: { calorias: null, carbohidratosG: null, liquidosMl: null },
    },
    antes: { cantidad: 0, macros: sinMacros, liquidosMl: null },
    carbohidratos: null,
    liquidos: null,
    intervaloMaximoMin: null,
    cafeina: {
      antesMg: null,
      duranteMg: null,
      totalMg: null,
      porHoraMg: null,
      mgPorKg: null,
    },
  },
};

function esPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}

describe("renderizarPlanificacionPdf", () => {
  it("dibuja una planificación completa, con paciente y competencia", async () => {
    const buffer = await renderizarPlanificacionPdf({
      planificacion: completa,
      nombrePaciente: "Ana García",
      competencia: {
        id: "com-1",
        nombre: "Ultra de la montaña",
        fecha: new Date("2026-11-15T00:00:00Z"),
        lugar: "Villa La Angostura",
      },
      config: null,
    });
    expect(esPdf(buffer)).toBe(true);
  });

  it("dibuja una vacía (sin carrera ni ingestas) sin romperse", async () => {
    const buffer = await renderizarPlanificacionPdf({ planificacion: vacia });
    expect(esPdf(buffer)).toBe(true);
  });
});
