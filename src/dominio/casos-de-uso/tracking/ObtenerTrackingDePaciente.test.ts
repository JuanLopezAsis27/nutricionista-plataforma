import { describe, it, expect, vi } from "vitest";
import { ObtenerTrackingDePaciente } from "./ObtenerTrackingDePaciente";
import {
  RegistroDiario,
  type PropiedadesRegistroDiario,
} from "../../entidades/RegistroDiario";
import {
  mockPacienteRepositorio,
  mockRegistroDiarioRepositorio,
  mockPlanRepositorio,
  mockAxiomaRepositorio,
  mockAntropometriaRepositorio,
  mockMetricaDispositivoRepositorio,
  pacienteEjemplo,
  axiomaEjemplo,
  planEjemplo,
  antropometriaEjemplo,
  metricaEjemplo,
} from "../_ayudas-test";

/** Construye un RegistroDiario completo (con hijos) para los tests. */
function registro(
  props: Partial<PropiedadesRegistroDiario> & { fecha: Date },
): RegistroDiario {
  return RegistroDiario.reconstruir({
    id: `reg-${props.fecha.getTime()}`,
    pacienteId: "pac-1",
    pesoKg: null,
    aguaMl: null,
    horasSueno: null,
    calidadSueno: null,
    notas: null,
    comidas: [],
    actividades: [],
    creadoEn: props.fecha,
    actualizadoEn: props.fecha,
    ...props,
  });
}

const DESDE = new Date("2026-07-01");
const HASTA = new Date("2026-07-31");

function tracking(deps: {
  registros?: RegistroDiario[];
  plan?: ReturnType<typeof planEjemplo> | null;
  axiomas?: ReturnType<typeof axiomaEjemplo>[];
  mediciones?: ReturnType<typeof antropometriaEjemplo>[];
  metricas?: ReturnType<typeof metricaEjemplo>[];
}) {
  return new ObtenerTrackingDePaciente(
    mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    }),
    mockRegistroDiarioRepositorio({
      listarPorRango: vi.fn(async () => deps.registros ?? []),
    }),
    mockPlanRepositorio({
      obtenerPlanActivoDePaciente: vi.fn(async () => deps.plan ?? null),
    }),
    mockAxiomaRepositorio({
      listarActivos: vi.fn(async () => deps.axiomas ?? []),
    }),
    mockAntropometriaRepositorio({
      listarPorPaciente: vi.fn(async () => deps.mediciones ?? []),
    }),
    mockMetricaDispositivoRepositorio({
      listarPorRango: vi.fn(async () => deps.metricas ?? []),
    }),
  ).ejecutar("pac-1", DESDE, HASTA);
}

describe("ObtenerTrackingDePaciente", () => {
  it("calcula la adherencia a un axioma de sueño (cumple / no cumple)", async () => {
    const t = await tracking({
      registros: [
        registro({ fecha: new Date("2026-07-10"), horasSueno: 8 }),
        registro({ fecha: new Date("2026-07-11"), horasSueno: 5 }),
      ],
      axiomas: [axiomaEjemplo()], // sueño ≥ 7 h
    });

    const suenio = t.adherencia[0]!;
    expect(suenio.diasEvaluados).toBe(2);
    expect(suenio.diasCumplidos).toBe(1);
    expect(suenio.porcentaje).toBe(50);
    expect(suenio.promedioPaciente).toBe(6.5);
    expect(suenio.objetivo).toBe("≥ 7 h");
  });

  it("calcula la concordancia por franja contra el plan activo", async () => {
    const plan = planEjemplo({
      comidas: [
        {
          nombre: "Desayuno",
          horaDesde: "08:00",
          opciones: [{ contenido: "café" }],
        },
        {
          nombre: "Almuerzo",
          horaDesde: "13:00",
          opciones: [{ contenido: "pollo" }],
        },
      ],
    });

    const t = await tracking({
      plan,
      registros: [
        registro({
          fecha: new Date("2026-07-10"),
          comidas: [
            {
              id: "c1",
              franja: "Desayuno",
              hora: null,
              descripcion: "café con leche",
              porcion: "1 taza",
              fotoArchivoId: null,
              creadoEn: new Date("2026-07-10"),
            },
          ],
        }),
      ],
    });

    expect(t.concordancia.tienePlan).toBe(true);
    expect(t.concordancia.franjasPlanificadas).toBe(2);
    expect(t.concordancia.diasEvaluados).toBe(1);
    expect(t.concordancia.coberturaPromedio).toBe(50); // 1 franja registrada de 2 esperadas
    const desayuno = t.concordancia.porFranja.find(
      (f) => f.franja === "Desayuno",
    )!;
    expect(desayuno.registrados).toBe(1);
    const almuerzo = t.concordancia.porFranja.find(
      (f) => f.franja === "Almuerzo",
    )!;
    expect(almuerzo.registrados).toBe(0);
  });

  it("usa el sueño del wearable (día incluido) cuando el diario no lo tiene", async () => {
    const t = await tracking({
      registros: [registro({ fecha: new Date("2026-07-10") })], // sin horasSueno
      axiomas: [axiomaEjemplo()], // sueño ≥ 7 h
      metricas: [
        metricaEjemplo({
          fecha: new Date("2026-07-10"),
          horasSueno: 8,
          minutosActividad: null,
        }),
      ],
    });

    const suenio = t.adherencia[0]!;
    expect(suenio.diasEvaluados).toBe(1);
    expect(suenio.diasCumplidos).toBe(1);
    expect(suenio.promedioPaciente).toBe(8);
  });

  it("ignora las métricas del wearable de días excluidos (opt-in)", async () => {
    const t = await tracking({
      registros: [registro({ fecha: new Date("2026-07-10") })],
      axiomas: [axiomaEjemplo()],
      metricas: [
        metricaEjemplo({
          fecha: new Date("2026-07-10"),
          horasSueno: 8,
          incluir: false,
        }),
      ],
    });

    expect(t.adherencia[0]!.diasEvaluados).toBe(0);
  });

  it("arma la serie de peso combinando diario y antropometría", async () => {
    const t = await tracking({
      registros: [registro({ fecha: new Date("2026-07-20"), pesoKg: 78 })],
      mediciones: [
        antropometriaEjemplo({ fecha: new Date("2026-07-01"), pesoKg: 80 }),
      ],
    });

    expect(t.peso.inicial).toBe(80);
    expect(t.peso.actual).toBe(78);
    expect(t.peso.variacion).toBe(-2);
    expect(t.peso.puntos).toHaveLength(2);
  });
});
