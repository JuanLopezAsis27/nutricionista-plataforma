// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

/**
 * Test de humo del entorno de UI.
 *
 * No prueba lógica de negocio: prueba que la tubería funcione —jsdom, el JSX
 * transpilado por esbuild, Testing Library y los matchers de jest-dom—. Si
 * mañana algo de eso se rompe al actualizar una dependencia, conviene que falle
 * acá y no dentro de un test de formulario, donde el diagnóstico es más caro.
 */
describe("entorno de tests de UI", () => {
  it("renderiza un componente y encuentra su texto en el DOM", () => {
    render(<Badge>Activo</Badge>);

    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("aplica las clases de la variante pedida", () => {
    render(<Badge variant="destructive">Archivado</Badge>);

    expect(screen.getByText("Archivado").className).toContain("destructive");
  });
});
