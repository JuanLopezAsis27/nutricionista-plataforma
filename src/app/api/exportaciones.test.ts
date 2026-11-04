import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Las exportaciones con datos clínicos (PDF y Excel). Son route handlers, así
 * que no pasan por los procedimientos de tRPC: cada una decide a mano quién
 * puede bajar qué, y es fácil que una nueva se olvide. Acá se verifica esa
 * decisión, no el contenido del documento.
 *
 * El inquilino no se prueba acá: lo acota la extensión de Prisma
 * (`argsConInquilino.test.ts`), así que un profesional que pide el id de un
 * paciente de otro consultorio recibe un «no encontrado» del servicio.
 */

type Sesion = {
  id: string;
  rol: "NUTRICIONISTA" | "PACIENTE" | "SUPERADMIN";
  pacienteId: string | null;
} | null;
let sesion: Sesion = null;
vi.mock("@/lib/autenticacion/sesion", () => ({
  usuarioDeSesion: async () => sesion,
}));
vi.mock("@/servidor/alcanceRequest", () => ({
  conAlcanceDeSesion: <T>(fn: () => Promise<T>) => fn(),
}));
vi.mock("@/infraestructura/monitoreo/monitor", () => ({
  monitorErrores: { capturar: vi.fn() },
}));
vi.mock("@/infraestructura/persistencia/erroresPrisma", () => ({
  traducirErrorPrisma: () => null,
}));

const paciente = { id: "pac-1", nombre: "Ana", apellido: "García" };
const medicion = { id: "med-1", fecha: new Date("2026-07-01T00:00:00Z") };
const plan = { id: "plan-1", nombre: "Plan base", comidas: [] };
const planificacion = { id: "pd-1", nombre: "Media maratón" };
const competencia = {
  id: "com-1",
  nombre: "Media de Buenos Aires",
  fecha: new Date("2026-08-23T00:00:00Z"),
  lugar: null,
};

const servicios = {
  paciente: {
    obtenerPacientePorId: vi.fn(async () => paciente),
    obtenerPacientes: vi.fn(async () => ({ pacientes: [] })),
  },
  evaluacion: {
    historiaClinica: { obtener: vi.fn(async () => null) },
    laboratorios: { obtener: vi.fn(async () => []) },
    antropometria: {
      obtenerComposicion: vi.fn(async () => ({ mediciones: [medicion] })),
    },
  },
  configuracion: { obtener: vi.fn(async () => ({ pdfMostrarRecetas: false })) },
  turno: { obtenerTurnos: vi.fn(async () => []) },
  establecimiento: { listar: vi.fn(async () => []) },
  plan: {
    obtenerPlanesDelPaciente: vi.fn(async () => [{ id: "plan-1" }]),
    obtenerPlanPorId: vi.fn(async () => plan),
  },
  receta: { obtenerRecetasPorIds: vi.fn(async () => []) },
  planificacion: {
    obtener: vi.fn(async (id: string) => ({ ...planificacion, id })),
    delPaciente: vi.fn(async () => [{ planificacion, competencia }]),
  },
};
vi.mock("@/infraestructura/contenedor/contenedor", () => ({
  servicioPaciente: () => servicios.paciente,
  servicioEvaluacion: () => servicios.evaluacion,
  servicioConfiguracion: () => servicios.configuracion,
  servicioTurno: () => servicios.turno,
  servicioEstablecimiento: () => servicios.establecimiento,
  servicioPlan: () => servicios.plan,
  servicioReceta: () => servicios.receta,
  servicioPlanificacionDeportiva: () => servicios.planificacion,
}));

// Los generadores de documentos no se prueban acá.
const pdf = async () => Buffer.from("%PDF");
vi.mock("@/infraestructura/pdf/EvaluacionPacientePdf", () => ({
  renderizarEvaluacionPdf: pdf,
}));
vi.mock("@/infraestructura/pdf/DashboardComposicionPdf", () => ({
  renderizarDashboardComposicionPdf: pdf,
}));
vi.mock("@/infraestructura/pdf/MedicionAntropometricaPdf", () => ({
  renderizarMedicionPdf: pdf,
}));
vi.mock("@/infraestructura/pdf/PlanNutricionalPdf", () => ({
  renderizarPlanPdf: pdf,
}));
const renderizarPlanificacionPdf = vi.fn(pdf);
vi.mock("@/infraestructura/pdf/PlanificacionDeportivaPdf", () => ({
  renderizarPlanificacionPdf,
}));
vi.mock("@/infraestructura/excel/MedicionesExcel", () => ({
  generarExcelMediciones: async () => new Uint8Array([1]),
}));

const evaluacionPdf = await import("./pacientes/[id]/evaluacion-pdf/route");
const dashboardPdf =
  await import("./pacientes/[id]/dashboard-antropometria-pdf/route");
const medicionesExcel = await import("./pacientes/[id]/mediciones-excel/route");
const pacientesExcel = await import("./pacientes/excel/route");
const turnosExcel = await import("./turnos/excel/route");
const planPdf = await import("./planes/[id]/pdf/route");
const medicionPdf = await import("./antropometria/[id]/pdf/route");
const planificacionPdf =
  await import("./planificacion-deportiva/[id]/pdf/route");

const NUTRI: Sesion = { id: "usr-n", rol: "NUTRICIONISTA", pacienteId: null };
const PACIENTE: Sesion = { id: "usr-p", rol: "PACIENTE", pacienteId: "pac-1" };
const ADMIN: Sesion = { id: "usr-a", rol: "SUPERADMIN", pacienteId: null };

const conId = (id: string) => ({ params: Promise.resolve({ id }) });
const pedido = (ruta: string) => new Request(`https://app.nutri.com${ruta}`);

/** Todos los servicios que un handler podría haber tocado para leer datos. */
function algunServicioLeido(): boolean {
  return [
    servicios.paciente.obtenerPacientePorId,
    servicios.paciente.obtenerPacientes,
    servicios.evaluacion.historiaClinica.obtener,
    servicios.evaluacion.antropometria.obtenerComposicion,
    servicios.turno.obtenerTurnos,
    servicios.plan.obtenerPlanPorId,
  ].some((fn) => fn.mock.calls.length > 0);
}

beforeEach(() => {
  vi.clearAllMocks();
  sesion = null;
});

const SOLO_PROFESIONAL = [
  [
    "evaluación en PDF",
    () =>
      evaluacionPdf.GET(
        pedido("/api/pacientes/pac-1/evaluacion-pdf"),
        conId("pac-1"),
      ),
  ],
  [
    "dashboard de composición en PDF",
    () =>
      dashboardPdf.GET(
        pedido("/api/pacientes/pac-1/dashboard-antropometria-pdf"),
        conId("pac-1"),
      ),
  ],
  [
    "mediciones en Excel",
    () =>
      medicionesExcel.GET(
        pedido("/api/pacientes/pac-1/mediciones-excel"),
        conId("pac-1"),
      ),
  ],
  [
    "pacientes en Excel",
    () => pacientesExcel.GET(pedido("/api/pacientes/excel")),
  ],
  ["turnos en Excel", () => turnosExcel.GET(pedido("/api/turnos/excel"))],
] as const;

describe.each(SOLO_PROFESIONAL)(
  "%s (solo el profesional)",
  (_nombre, llamar) => {
    it("sin sesión responde 401 sin leer nada", async () => {
      expect((await llamar()).status).toBe(401);
      expect(algunServicioLeido()).toBe(false);
    });

    it("un PACIENTE recibe 403 sin leer nada, aunque pida su propia ficha", async () => {
      sesion = PACIENTE;
      expect((await llamar()).status).toBe(403);
      expect(algunServicioLeido()).toBe(false);
    });

    it("el SUPERADMIN tampoco: no es profesional de ningún consultorio", async () => {
      sesion = ADMIN;
      expect((await llamar()).status).toBe(403);
      expect(algunServicioLeido()).toBe(false);
    });

    it("el profesional lo baja, sin caché", async () => {
      sesion = NUTRI;
      const respuesta = await llamar();
      expect(respuesta.status).toBe(200);
      expect(respuesta.headers.get("Cache-Control")).toBe("no-store");
    });
  },
);

describe("plan en PDF", () => {
  const llamar = (id = "plan-1") =>
    planPdf.GET(pedido(`/api/planes/${id}/pdf`), conId(id));

  it("sin sesión responde 401", async () => {
    expect((await llamar()).status).toBe(401);
  });

  it("un paciente baja un plan que tiene ASIGNADO", async () => {
    sesion = PACIENTE;

    expect((await llamar()).status).toBe(200);
    expect(servicios.plan.obtenerPlanesDelPaciente).toHaveBeenCalledWith(
      "pac-1",
    );
  });

  it("un paciente NO baja un plan que no tiene asignado, y ni se lo lee", async () => {
    sesion = PACIENTE;

    expect((await llamar("plan-de-otro")).status).toBe(403);
    expect(servicios.plan.obtenerPlanPorId).not.toHaveBeenCalled();
  });

  it("una sesión sin ficha (SUPERADMIN) recibe 403", async () => {
    sesion = ADMIN;
    expect((await llamar()).status).toBe(403);
    expect(servicios.plan.obtenerPlanPorId).not.toHaveBeenCalled();
  });

  it("el profesional baja cualquiera de su consultorio", async () => {
    sesion = NUTRI;
    expect((await llamar("plan-9")).status).toBe(200);
    expect(servicios.plan.obtenerPlanesDelPaciente).not.toHaveBeenCalled();
  });
});

describe("planificación deportiva en PDF", () => {
  const llamar = (id = "pd-1", query = "") =>
    planificacionPdf.GET(
      pedido(`/api/planificacion-deportiva/${id}/pdf${query}`),
      conId(id),
    );

  it("sin sesión responde 401", async () => {
    expect((await llamar()).status).toBe(401);
    expect(renderizarPlanificacionPdf).not.toHaveBeenCalled();
  });

  it("un paciente baja una que tiene ASIGNADA, con su competencia", async () => {
    sesion = PACIENTE;

    const respuesta = await llamar();
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Cache-Control")).toBe("no-store");
    expect(servicios.planificacion.delPaciente).toHaveBeenCalledWith("pac-1");
    expect(renderizarPlanificacionPdf).toHaveBeenCalledWith(
      expect.objectContaining({ nombrePaciente: "Ana García", competencia }),
    );
  });

  it("un paciente NO baja una que no tiene asignada, y ni se la lee", async () => {
    sesion = PACIENTE;

    expect((await llamar("pd-de-otro")).status).toBe(403);
    expect(servicios.planificacion.obtener).not.toHaveBeenCalled();
    expect(renderizarPlanificacionPdf).not.toHaveBeenCalled();
  });

  it("una sesión sin ficha (SUPERADMIN) recibe 403", async () => {
    sesion = ADMIN;
    expect((await llamar()).status).toBe(403);
    expect(renderizarPlanificacionPdf).not.toHaveBeenCalled();
  });

  it("el profesional baja cualquiera de su consultorio, sin paciente", async () => {
    sesion = NUTRI;

    expect((await llamar("pd-9")).status).toBe(200);
    expect(servicios.planificacion.obtener).toHaveBeenCalledWith("pd-9");
    expect(servicios.planificacion.delPaciente).not.toHaveBeenCalled();
    expect(renderizarPlanificacionPdf).toHaveBeenCalledWith(
      expect.objectContaining({ nombrePaciente: null, competencia: null }),
    );
  });

  it("desde la ficha lleva el paciente y la competencia para la que se la asignó", async () => {
    sesion = NUTRI;

    expect((await llamar("pd-1", "?paciente=pac-1")).status).toBe(200);
    expect(renderizarPlanificacionPdf).toHaveBeenCalledWith(
      expect.objectContaining({ nombrePaciente: "Ana García", competencia }),
    );
  });
});

describe("medición antropométrica en PDF", () => {
  const llamar = (query = "") =>
    medicionPdf.GET(
      pedido(`/api/antropometria/med-1/pdf${query}`),
      conId("med-1"),
    );

  it("un paciente baja una medición SUYA", async () => {
    sesion = PACIENTE;

    expect((await llamar()).status).toBe(200);
    expect(
      servicios.evaluacion.antropometria.obtenerComposicion,
    ).toHaveBeenCalledWith("pac-1");
  });

  it("un paciente que nombra la ficha de OTRO recibe 403 sin leerla", async () => {
    sesion = PACIENTE;

    expect((await llamar("?paciente=pac-otro")).status).toBe(403);
    expect(
      servicios.evaluacion.antropometria.obtenerComposicion,
    ).not.toHaveBeenCalled();
  });

  it("el profesional tiene que decir de qué paciente", async () => {
    sesion = NUTRI;

    expect((await llamar()).status).toBe(403);
    expect((await llamar("?paciente=pac-1")).status).toBe(200);
  });

  it("una medición que no es de esa ficha da 404", async () => {
    sesion = PACIENTE;
    servicios.evaluacion.antropometria.obtenerComposicion.mockResolvedValueOnce(
      {
        mediciones: [],
      },
    );

    expect((await llamar()).status).toBe(404);
  });
});
