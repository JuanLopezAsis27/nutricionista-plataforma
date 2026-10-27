// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { FormatoPlanificacion } from "@/dominio/entidades/PlanificacionDeportiva";

/**
 * La pestaña «Deporte» ofrece planificar según el deporte del perfil
 * (migración 98): un deporte sin planificación no ofrece crear ni asignar.
 */

let formato: FormatoPlanificacion | null = null;
const consulta = <T,>(data: T) => ({ data, isLoading: false });
const mutacion = { mutate: vi.fn(), isPending: false };

vi.mock("@/lib/hooks/useDeportivo", () => ({
  useDeportivo: () => ({
    obtenerPerfil: () =>
      consulta({
        id: "perf-1",
        pacienteId: "pac-1",
        deporte: {
          id: "dpt-1",
          nombre: formato ? "Trail running" : "Fútbol",
          formatoPlanificacion: formato,
        },
        disciplina: null,
        nivel: "AMATEUR",
        fase: "COMPETENCIA",
        diasEntrenamientoSemana: null,
        horasSemana: null,
        pesoCategoriaKg: null,
        posicion: null,
        objetivo: null,
        notas: null,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      }),
    listarCompetencias: () =>
      consulta([
        {
          id: "com-1",
          pacienteId: "pac-1",
          nombre: "Ultra de la montaña",
          // Una fecha futura: las pasadas no ofrecen planificar.
          fecha: new Date(Date.UTC(2099, 0, 1)),
          lugar: null,
          objetivo: null,
          resultado: null,
          importancia: "A",
          notas: null,
          creadoEn: new Date(),
        },
      ]),
    eliminarCompetencia: mutacion,
  }),
}));

vi.mock("@/lib/hooks/usePlanificacionDeportiva", () => ({
  usePlanificacionDeportiva: () => ({
    delPaciente: () => consulta([]),
    desasignar: mutacion,
  }),
}));

// El diálogo tiene sus propias queries; acá alcanza con saber que está.
vi.mock("@/componentes/planificacion-deportiva/DialogosPlanificacion", () => ({
  DialogoAsignarPlanificacion: () => null,
}));

const { SeccionDeportiva } = await import("./SeccionDeportiva");

afterEach(() => cleanup());

describe("SeccionDeportiva según el perfil", () => {
  it("con un deporte sin planificación, no ofrece planificar ni asignar", () => {
    formato = null;
    render(<SeccionDeportiva pacienteId="pac-1" />);
    expect(screen.queryByRole("link", { name: /Planificar/ })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Asignar existente/ }),
    ).toBeNull();
    expect(screen.queryByRole("link", { name: /Nueva/ })).toBeNull();
    expect(
      screen.getByText(/«Fútbol», todavía no tiene planificación/),
    ).toBeTruthy();
  });

  it("con un deporte de trail, cada competencia ofrece planificar y asignar", () => {
    formato = "CARRERA_TRAIL";
    render(<SeccionDeportiva pacienteId="pac-1" />);
    const planificar = screen.getByRole("link", { name: /Planificar/ });
    expect(planificar.getAttribute("href")).toContain("competenciaId=com-1");
    // Uno en la competencia y otro en la lista de planificaciones.
    expect(
      screen.getAllByRole("button", { name: /Asignar existente/ }),
    ).toHaveLength(2);
    expect(
      screen.getByText("Trail running", { selector: "strong" }),
    ).toBeTruthy();
  });
});
