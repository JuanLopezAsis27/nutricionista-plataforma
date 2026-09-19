// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { PlanSalidaDto } from "@/aplicacion/dtos/plan.dto";
import { planDeEjemplo } from "@/componentes/planes/_ayudas-test";

/**
 * La página de UN plan del paciente se arma con la lista de sus planes, no con
 * una consulta por id: esa lista es la autorización. Lo que se fija acá es
 * justamente eso —que muestre el plan pedido si es suyo, y que un id que no
 * está en la lista no muestre nada del plan— y que siempre haya por dónde
 * volver.
 */

let planes: PlanSalidaDto[] = [];
let idPedido = "";

vi.mock("@/lib/hooks/usePlanes", () => ({
  usePlanes: () => ({
    misPlanes: () => ({ data: planes, isLoading: false }),
  }),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: idPedido }),
  useRouter: () => ({ push: vi.fn() }),
}));

const { default: PaginaUnPlan } = await import("./page");

beforeEach(() => {
  planes = [
    planDeEjemplo("pla-1", "Descenso"),
    planDeEjemplo("pla-2", "Competencia"),
  ];
});

afterEach(() => cleanup());

describe("/mi-plan/[id]", () => {
  it("muestra el plan pedido y solo ese", () => {
    idPedido = "pla-2";
    render(<PaginaUnPlan />);

    expect(screen.getByText("Opción de Competencia")).toBeTruthy();
    expect(screen.queryByText("Opción de Descenso")).toBeNull();
  });

  it("un plan que no está entre los suyos no muestra nada del plan", () => {
    // Un id ajeno, o uno que le desasignaron con la pantalla abierta.
    idPedido = "pla-de-otro";
    render(<PaginaUnPlan />);

    expect(
      screen.getByText("Este plan no está entre los que tenés asignados."),
    ).toBeTruthy();
    expect(screen.queryByText(/Opción de/)).toBeNull();
  });

  it("siempre ofrece volver a la lista de planes", () => {
    idPedido = "pla-1";
    render(<PaginaUnPlan />);

    expect(
      screen.getByRole("link", { name: /Mis planes/ }).getAttribute("href"),
    ).toBe("/mi-plan");
  });
});
