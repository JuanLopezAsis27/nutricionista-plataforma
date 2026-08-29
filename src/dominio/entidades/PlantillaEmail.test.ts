import { describe, it, expect } from "vitest";
import { PlantillaEmail } from "./PlantillaEmail";
import { ErrorValidacion } from "../errores/ErrorValidacion";

describe("PlantillaEmail", () => {
  const base = {
    clave: "RECORDATORIO_TURNO",
    nombre: "Recordatorio",
    asunto: "Turno del {{fecha}}",
    cuerpoHtml:
      "<p>Hola {{ paciente }}, te esperamos el {{fecha}} a las {{hora}}.</p>",
  };

  it("reemplaza los placeholders (con espacios opcionales) al renderizar", () => {
    const plantilla = PlantillaEmail.crear(base, "pla-1");
    const { asunto, html } = plantilla.renderizar({
      paciente: "Ana García",
      fecha: "27/07/2026",
      hora: "10:00",
    });

    expect(asunto).toBe("Turno del 27/07/2026");
    expect(html).toBe(
      "<p>Hola Ana García, te esperamos el 27/07/2026 a las 10:00.</p>",
    );
  });

  it("deja intacto un placeholder sin valor provisto", () => {
    const plantilla = PlantillaEmail.crear(base, "pla-1");
    const { html } = plantilla.renderizar({ paciente: "Ana" });
    expect(html).toContain("{{fecha}}");
  });

  it("normaliza la clave a mayúsculas y rechaza claves inválidas", () => {
    expect(
      PlantillaEmail.crear({ ...base, clave: "bienvenida" }, "x").clave,
    ).toBe("BIENVENIDA");
    expect(() =>
      PlantillaEmail.crear({ ...base, clave: "1mala" }, "x"),
    ).toThrow(ErrorValidacion);
  });

  it("al actualizar preserva id, clave y deSistema", () => {
    const plantilla = PlantillaEmail.crear(
      { ...base, deSistema: true },
      "pla-1",
    );
    const editada = plantilla.actualizar({
      nombre: "Nuevo",
      asunto: "Nuevo asunto",
      cuerpoHtml: "<p>x</p>",
    });
    const p = editada.aPrimitivos();
    expect(p.id).toBe("pla-1");
    expect(p.clave).toBe("RECORDATORIO_TURNO");
    expect(p.deSistema).toBe(true);
    expect(p.nombre).toBe("Nuevo");
  });

  it("exige asunto y cuerpo no vacíos", () => {
    expect(() => PlantillaEmail.crear({ ...base, asunto: "  " }, "x")).toThrow(
      ErrorValidacion,
    );
    expect(() =>
      PlantillaEmail.crear({ ...base, cuerpoHtml: "" }, "x"),
    ).toThrow(ErrorValidacion);
  });
});
