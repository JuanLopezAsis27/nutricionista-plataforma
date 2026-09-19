// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { PlanSalidaDto } from "@/aplicacion/dtos/plan.dto";
import { planDeEjemplo as plan } from "@/componentes/planes/_ayudas-test";

/**
 * «Mi plan» cambia de forma según cuántos planes tiene el paciente, y eso es lo
 * que fijan estas tests:
 *
 * - con UNO se ve el plan entero, sin una tarjeta de por medio: es el caso
 *   común, y hacerle tocar algo para ver lo único que hay sería un paso de más;
 * - con VARIOS se ven tarjetas, cada una un enlace a `/mi-plan/[id]`, y ningún
 *   plan abierto: dibujarlos todos enteros era lo que dejaba el segundo a
 *   varias pantallas de scroll en el teléfono.
 *
 * Los hooks de datos se sustituyen por dobles: el objetivo es qué dibuja la
 * página, no la capa de red.
 */

let planes: PlanSalidaDto[] = [];

vi.mock("@/lib/hooks/usePlanes", () => ({
  usePlanes: () => ({
    misPlanes: () => ({ data: planes, isLoading: false }),
  }),
}));

// El menú semanal y la suplementación son otras secciones de la página, con su
// propia lógica; acá no tienen nada que mostrar.
vi.mock("@/lib/hooks/usePlanesSemanales", () => ({
  usePlanesSemanales: () => ({ miPlanSemanal: () => ({ data: null }) }),
}));
vi.mock("@/lib/hooks/useSeguimiento", () => ({
  useSeguimiento: () => ({ misSuplementos: () => ({ data: [] }) }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const { default: PaginaMiPlan } = await import("./page");

beforeEach(() => {
  planes = [];
});

afterEach(() => cleanup());

describe("«Mi plan»", () => {
  it("con un solo plan lo muestra entero, sin tarjeta", () => {
    planes = [plan("pla-1", "Descenso")];
    render(<PaginaMiPlan />);

    expect(screen.getByText("Opción de Descenso")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Descenso/ })).toBeNull();
  });

  it("con varios muestra una tarjeta por plan, cada una a su página", () => {
    planes = [plan("pla-1", "Descenso"), plan("pla-2", "Competencia")];
    render(<PaginaMiPlan />);

    expect(
      screen.getByRole("link", { name: /Descenso/ }).getAttribute("href"),
    ).toBe("/mi-plan/pla-1");
    expect(
      screen.getByRole("link", { name: /Competencia/ }).getAttribute("href"),
    ).toBe("/mi-plan/pla-2");

    // Ninguno abierto: el contenido de un plan se ve recién al entrar.
    expect(screen.queryByText("Opción de Descenso")).toBeNull();
    expect(screen.queryByText("Opción de Competencia")).toBeNull();
  });

  it("sin planes lo dice", () => {
    render(<PaginaMiPlan />);

    expect(screen.getByText(/Todavía no tenés un plan asignado/)).toBeTruthy();
  });
});
