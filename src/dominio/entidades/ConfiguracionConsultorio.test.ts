import { describe, it, expect } from "vitest";
import { ConfiguracionConsultorio } from "./ConfiguracionConsultorio";
import { EVOLUCIONES_PACIENTE_POR_DEFECTO } from "./evolucionesAntropometria";
import type { EvolucionAntropometria } from "./evolucionesAntropometria";
import { ErrorValidacion } from "../errores/ErrorValidacion";

describe("ConfiguracionConsultorio — evoluciones del paciente", () => {
  it("arranca en peso, cintura y prensión", () => {
    expect(ConfiguracionConsultorio.porDefecto().evolucionesPaciente).toEqual(
      EVOLUCIONES_PACIENTE_POR_DEFECTO,
    );
  });

  it("guarda en el orden del catálogo y sin repetidos", () => {
    const config = ConfiguracionConsultorio.porDefecto().actualizar({
      evolucionesPaciente: ["pliegueTricipital", "pesoKg", "pesoKg"],
    });
    expect(config.evolucionesPaciente).toEqual(["pesoKg", "pliegueTricipital"]);
  });

  it("no deja la lista vacía", () => {
    expect(() =>
      ConfiguracionConsultorio.porDefecto().actualizar({
        evolucionesPaciente: [],
      }),
    ).toThrow(ErrorValidacion);
  });

  it("rechaza un id que no existe", () => {
    expect(() =>
      ConfiguracionConsultorio.porDefecto().actualizar({
        evolucionesPaciente: ["inventada" as EvolucionAntropometria],
      }),
    ).toThrow(ErrorValidacion);
  });
});
