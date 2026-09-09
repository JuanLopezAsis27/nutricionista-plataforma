import { describe, it, expect } from "vitest";
import { CampoHistoriaClinica } from "./CampoHistoriaClinica";
// La derivación de la clave se comparte con los campos de evolución: la regla
// del slug tiene que ser UNA, o el mismo nombre daría claves distintas según
// en qué formulario se lo definió.
import { derivarClave } from "../servicios/claveCampo";
import { ErrorValidacion } from "../errores/ErrorValidacion";

describe("CampoHistoriaClinica", () => {
  it("deriva la clave del nombre al crearlo", () => {
    const campo = CampoHistoriaClinica.crear(
      { nombre: "Adherencia Previa" },
      "campo-1",
    );
    expect(campo.clave).toMatch(/^adherencia-previa-[0-9a-f]{8}$/);
    expect(campo.nombre).toBe("Adherencia Previa");
  });

  it("saca los acentos y la puntuación de la clave", () => {
    expect(derivarClave("Composición corporal (¡inicial!)")).toMatch(
      /^composicion-corporal-inicial-[0-9a-f]{8}$/,
    );
  });

  it("da claves distintas a nombres que se normalizan igual", () => {
    // Si colisionaran, los dos campos escribirían sobre el mismo valor en la
    // historia de cada paciente.
    expect(derivarClave("Suplementos")).not.toBe(derivarClave("suplementos!"));
  });

  it("NO cambia la clave al renombrar el campo", () => {
    // Es el invariante que sostiene lo ya cargado en las fichas: si la clave
    // se moviera, renombrar vaciaría el campo en todos los pacientes.
    const campo = CampoHistoriaClinica.crear(
      { nombre: "Adherencia" },
      "campo-1",
    );
    const renombrado = campo.actualizar({ nombre: "Adherencia previa" });

    expect(renombrado.clave).toBe(campo.clave);
    expect(renombrado.nombre).toBe("Adherencia previa");
  });

  it("conserva la descripción y el orden si no se los edita", () => {
    const campo = CampoHistoriaClinica.crear(
      { nombre: "Suplementos", descripcion: "Marca y dosis", orden: 3 },
      "campo-1",
    );
    const renombrado = campo.actualizar({ nombre: "Suplementación" });

    expect(renombrado.descripcion).toBe("Marca y dosis");
    expect(renombrado.orden).toBe(3);
  });

  it("rechaza un nombre vacío", () => {
    expect(() =>
      CampoHistoriaClinica.crear({ nombre: "   " }, "campo-1"),
    ).toThrow(ErrorValidacion);
  });

  it("rechaza un nombre de más de 80 caracteres", () => {
    expect(() =>
      CampoHistoriaClinica.crear({ nombre: "x".repeat(81) }, "campo-1"),
    ).toThrow(ErrorValidacion);
  });
});
