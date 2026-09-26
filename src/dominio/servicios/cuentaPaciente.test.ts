import { describe, it, expect } from "vitest";
import { consultorioInicial, esCuentaExclusiva } from "./cuentaPaciente";
import type { ConsultorioDeCuenta } from "../repositorios/ICuentaPacienteRepositorio";

function consultorio(pacienteId: string): ConsultorioDeCuenta {
  return {
    pacienteId,
    nutricionistaId: `nutri-de-${pacienteId}`,
    nombreProfesional: `Lic. ${pacienteId}`,
    fotoProfesionalId: null,
  };
}

describe("esCuentaExclusiva", () => {
  it("con un solo acceso (el propio), la cuenta es de este consultorio", () => {
    expect(esCuentaExclusiva(1)).toBe(true);
  });

  it("con dos o más, la comparte con otro", () => {
    expect(esCuentaExclusiva(2)).toBe(false);
    expect(esCuentaExclusiva(5)).toBe(false);
  });
});

describe("consultorioInicial", () => {
  it("con un solo consultorio no hay nada que elegir", () => {
    const unico = consultorio("pac-a");
    expect(consultorioInicial([unico], null)).toBe(unico);
  });

  it("con varios, arranca en el que eligió en este dispositivo", () => {
    const elegido = consultorio("pac-b");
    expect(consultorioInicial([consultorio("pac-a"), elegido], "pac-b")).toBe(
      elegido,
    );
  });

  it("con varios y sin elección, le toca elegir", () => {
    expect(
      consultorioInicial([consultorio("pac-a"), consultorio("pac-b")], null),
    ).toBeNull();
  });

  it("una elección que ya no es suya no se respeta", () => {
    // La cookie puede nombrar una ficha borrada, o una ajena.
    expect(
      consultorioInicial(
        [consultorio("pac-a"), consultorio("pac-b")],
        "pac-de-otra-persona",
      ),
    ).toBeNull();
  });

  it("sin consultorios, ninguno", () => {
    expect(consultorioInicial([], "pac-a")).toBeNull();
  });
});
