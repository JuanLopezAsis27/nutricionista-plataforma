// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import { DetalleMedicion } from "./DetalleMedicion";

/**
 * La ficha de una medición tiene dos lectores: el profesional, que la corrige,
 * y el paciente, que la consulta desde su portal. Entre uno y otro cambian las
 * acciones, no las medidas que se ven.
 */
const MEDICION = {
  id: "m1",
  fecha: new Date("2024-03-15T00:00:00.000Z"),
  observaciones: null,
  nivelActividad: null,
  protocolo: "DOS_COMPONENTES",
  metodoGrasa: null,
  edadAnios: 41,
  medidas: { pesoKg: 87.3, pliegueTricipital: 35 },
  resultado: {
    indices: {
      imc: null,
      indiceCinturaCadera: null,
      sumatoria6Pliegues: null,
      sumatoria8Pliegues: null,
    },
    fraccionamiento: null,
    somatotipo: null,
    energia: null,
    grasaPorPliegues: { resultados: [] },
    faltantes: [{ bloque: "SOMATOTIPO", campos: ["Diámetro humeral"] }],
  },
} as unknown as MedicionComposicionDto;

afterEach(() => cleanup());

describe("DetalleMedicion", () => {
  it("en solo lectura muestra lo que se midió, sin acciones ni faltantes", () => {
    render(<DetalleMedicion medicion={MEDICION} anterior={null} />);

    expect(screen.getByText("Peso (kg)")).toBeTruthy();
    expect(screen.getByText("Tricipital")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /editar/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /eliminar/i })).toBeNull();
    // Qué faltó medir le sirve a quien mide, no al paciente.
    expect(screen.queryByText(/no alcanza para todo/i)).toBeNull();
  });

  it("con acciones muestra editar, eliminar y lo que faltó medir", () => {
    render(
      <DetalleMedicion
        medicion={MEDICION}
        anterior={null}
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /editar/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /eliminar/i })).toBeTruthy();
    expect(screen.getByText(/no alcanza para todo/i)).toBeTruthy();
  });
});
