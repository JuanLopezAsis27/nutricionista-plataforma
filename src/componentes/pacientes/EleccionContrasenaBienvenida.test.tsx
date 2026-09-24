// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  EleccionContrasenaBienvenida,
  ELECCION_CONTRASENA_INICIAL,
  contrasenaParaEnvio,
  errorEleccionContrasena,
  type EleccionContrasena,
} from "./EleccionContrasenaBienvenida";
import { LARGO_MINIMO_PASSWORD } from "@/aplicacion/dtos/password";

function Envoltorio({
  alCambiar,
}: {
  alCambiar: (e: EleccionContrasena) => void;
}) {
  const [valor, setValor] = useState(ELECCION_CONTRASENA_INICIAL);
  return (
    <EleccionContrasenaBienvenida
      valor={valor}
      onCambiar={(e) => {
        setValor(e);
        alCambiar(e);
      }}
      cantidadPacientes={3}
    />
  );
}

describe("EleccionContrasenaBienvenida", () => {
  it("arranca generándola, sin campo para escribir", () => {
    render(<Envoltorio alCambiar={vi.fn()} />);

    expect(screen.getByRole("radio", { name: /generarla/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.queryByLabelText("Contraseña")).not.toBeInTheDocument();
  });

  it("al elegir escribirla, pide la contraseña y avisa si no cumple la política", async () => {
    const alCambiar = vi.fn();
    render(<Envoltorio alCambiar={alCambiar} />);

    await userEvent.click(screen.getByRole("radio", { name: /escribirla/i }));
    // Con varios pacientes, que quede claro que es la misma para todos.
    expect(screen.getByText("La misma para todos")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Contraseña"), "corta");

    expect(
      screen.getByText(new RegExp(`${LARGO_MINIMO_PASSWORD} caracteres`)),
    ).toBeInTheDocument();
    expect(alCambiar).toHaveBeenLastCalledWith({
      modo: "MANUAL",
      valor: "corta",
    });
  });
});

describe("reglas de la elección", () => {
  it("la generada siempre se puede mandar; la escrita, solo si cumple la política", () => {
    expect(errorEleccionContrasena({ modo: "GENERADA", valor: "" })).toBeNull();
    expect(
      errorEleccionContrasena({ modo: "MANUAL", valor: "" }),
    ).not.toBeNull();
    expect(
      errorEleccionContrasena({ modo: "MANUAL", valor: "melon-tractor-lunes" }),
    ).toBeNull();
  });

  it("lo que viaja: la escrita lleva su valor, la generada no lleva nada", () => {
    expect(contrasenaParaEnvio({ modo: "GENERADA", valor: "x" })).toEqual({
      modo: "GENERADA",
    });
    expect(
      contrasenaParaEnvio({ modo: "MANUAL", valor: "melon-tractor-lunes" }),
    ).toEqual({ modo: "MANUAL", valor: "melon-tractor-lunes" });
  });
});
