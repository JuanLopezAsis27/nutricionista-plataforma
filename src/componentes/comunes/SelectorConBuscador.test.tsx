// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectorConBuscador, filtrarOpciones } from "./SelectorConBuscador";

afterEach(() => cleanup());

const DEPORTES = [
  { id: "d1", nombre: "Fútbol" },
  { id: "d2", nombre: "Trail running" },
  { id: "d3", nombre: "Running" },
  { id: "d4", nombre: "Natación" },
];

describe("filtrarOpciones", () => {
  it("busca sin tildes ni mayúsculas, palabra por palabra", () => {
    expect(filtrarOpciones(DEPORTES, "futbol").map((d) => d.id)).toEqual([
      "d1",
    ]);
    expect(filtrarOpciones(DEPORTES, "RUN trail").map((d) => d.id)).toEqual([
      "d2",
    ]);
    expect(filtrarOpciones(DEPORTES, "running").map((d) => d.id)).toEqual([
      "d2",
      "d3",
    ]);
    expect(filtrarOpciones(DEPORTES, "  ")).toHaveLength(4);
  });
});

describe("SelectorConBuscador", () => {
  it("filtra mientras se escribe y elige con Enter", async () => {
    const onCambiar = vi.fn();
    render(
      <SelectorConBuscador
        opciones={DEPORTES}
        valor={null}
        onCambiar={onCambiar}
        placeholder="Elegí el deporte…"
        placeholderBusqueda="Buscar deporte…"
        sinResultados="No está en la lista."
      />,
    );

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.type(screen.getByLabelText("Buscar deporte…"), "natacion");
    expect(screen.queryByText("Fútbol")).toBeNull();
    await userEvent.keyboard("{Enter}");
    expect(onCambiar).toHaveBeenCalledWith("d4");
  });

  it("dice que no está en la lista cuando no encuentra nada", async () => {
    render(
      <SelectorConBuscador
        opciones={DEPORTES}
        valor="d1"
        onCambiar={vi.fn()}
        placeholderBusqueda="Buscar deporte…"
        sinResultados="No está en la lista."
      />,
    );
    // Muestra el elegido.
    expect(screen.getByRole("combobox").textContent).toContain("Fútbol");
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.type(screen.getByLabelText("Buscar deporte…"), "curling");
    expect(screen.getByText("No está en la lista.")).toBeTruthy();
  });
});
