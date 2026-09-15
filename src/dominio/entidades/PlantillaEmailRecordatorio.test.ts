import { describe, it, expect } from "vitest";
import {
  PlantillaEmailRecordatorio,
  MAX_DIAS_ANTES_PLANTILLA_EMAIL,
} from "./PlantillaEmailRecordatorio";
import { ErrorValidacion } from "../errores/ErrorValidacion";

describe("PlantillaEmailRecordatorio", () => {
  const base = {
    nombre: "Recordatorio",
    asunto: "Turno del {{fecha}}",
    cuerpoHtml:
      "<p>Hola {{ paciente }}, te esperamos el {{fecha}} a las {{hora}}.</p>",
    diasAntes: null,
    predeterminada: false,
    activa: true,
    incluirBotonConfirmacion: true,
  };

  it("reemplaza los placeholders (con espacios opcionales) al renderizar", () => {
    const plantilla = PlantillaEmailRecordatorio.crear(base, "pla-1");
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

  it("exige nombre, asunto y cuerpo no vacíos", () => {
    expect(() =>
      PlantillaEmailRecordatorio.crear({ ...base, nombre: "  " }, "x"),
    ).toThrow(ErrorValidacion);
    expect(() =>
      PlantillaEmailRecordatorio.crear({ ...base, asunto: "" }, "x"),
    ).toThrow(ErrorValidacion);
    expect(() =>
      PlantillaEmailRecordatorio.crear({ ...base, cuerpoHtml: "" }, "x"),
    ).toThrow(ErrorValidacion);
  });

  it("acepta un día null (sin asignar) y rechaza uno fuera de rango", () => {
    expect(PlantillaEmailRecordatorio.crear(base, "x").diasAntes).toBeNull();
    expect(() =>
      PlantillaEmailRecordatorio.crear(
        { ...base, diasAntes: MAX_DIAS_ANTES_PLANTILLA_EMAIL + 1 },
        "x",
      ),
    ).toThrow(ErrorValidacion);
    expect(() =>
      PlantillaEmailRecordatorio.crear({ ...base, diasAntes: -1 }, "x"),
    ).toThrow(ErrorValidacion);
  });

  it("desmarcarPredeterminada y liberarDia son no-ops si ya estaban así", () => {
    const plantilla = PlantillaEmailRecordatorio.crear(base, "pla-1");
    expect(plantilla.desmarcarPredeterminada()).toBe(plantilla);
    expect(plantilla.liberarDia()).toBe(plantilla);
  });

  it("liberarDia limpia el día asignado", () => {
    const plantilla = PlantillaEmailRecordatorio.crear(
      { ...base, diasAntes: 3 },
      "pla-1",
    );
    expect(plantilla.liberarDia().diasAntes).toBeNull();
  });
});
