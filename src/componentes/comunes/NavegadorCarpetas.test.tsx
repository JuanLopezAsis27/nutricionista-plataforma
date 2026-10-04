// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { NavegadorCarpetas, propsArrastrable } from "./NavegadorCarpetas";

function dibujar(onSoltar = vi.fn()) {
  render(
    <NavegadorCarpetas
      carpetas={[
        { id: "c-1", nombre: "Julia Pérez", descripcion: null, cantidad: 2 },
      ]}
      cargando={false}
      carpetaId={null}
      onAbrir={vi.fn()}
      busqueda=""
      onBuscar={vi.fn()}
      singular="plan"
      plural="planes"
      ejemplos=""
      onCrear={vi.fn()}
      onActualizar={vi.fn()}
      onEliminar={vi.fn()}
      onSoltar={onSoltar}
      guardando={false}
      eliminando={false}
    />,
  );
  return onSoltar;
}

/** Un dataTransfer mínimo que guarda lo que el arrastre le pone. */
function transferencia() {
  const datos = new Map<string, string>();
  return {
    get types() {
      return [...datos.keys()];
    },
    setData: (tipo: string, valor: string) => datos.set(tipo, valor),
    getData: (tipo: string) => datos.get(tipo) ?? "",
    effectAllowed: "",
    dropEffect: "",
  };
}

describe("NavegadorCarpetas — arrastrar a una carpeta", () => {
  afterEach(cleanup);

  it("soltar un elemento sobre la carpeta lo mueve ahí", () => {
    const onSoltar = dibujar();
    const dataTransfer = transferencia();
    propsArrastrable("plan-7").onDragStart!({
      dataTransfer,
    } as unknown as Parameters<
      NonNullable<ReturnType<typeof propsArrastrable>["onDragStart"]>
    >[0]);

    const carpeta = screen.getByText("Julia Pérez").closest("li")!;
    fireEvent.dragOver(carpeta, { dataTransfer });
    fireEvent.drop(carpeta, { dataTransfer });

    expect(onSoltar).toHaveBeenCalledWith("plan-7", "c-1");
  });

  it("ignora lo que no viene de la lista (un archivo, un texto)", () => {
    const onSoltar = dibujar();
    const dataTransfer = transferencia();
    dataTransfer.setData("text/plain", "cualquier cosa");

    const carpeta = screen.getByText("Julia Pérez").closest("li")!;
    fireEvent.drop(carpeta, { dataTransfer });

    expect(onSoltar).not.toHaveBeenCalled();
  });
});
