import { describe, it, expect } from "vitest";
import {
  PlantillaWhatsapp,
  MAX_DIAS_ANTES_PLANTILLA,
  CUERPO_RECORDATORIO_POR_DEFECTO,
} from "./PlantillaWhatsapp";
import { ErrorValidacion } from "../errores/ErrorValidacion";

describe("PlantillaWhatsapp", () => {
  const base = {
    nombre: "Recordatorio",
    cuerpo: CUERPO_RECORDATORIO_POR_DEFECTO,
    claveMeta: null,
    idiomaMeta: "es_AR",
    variablesMeta: [],
    diasAntes: null,
    predeterminada: false,
    activa: true,
  };

  it("acepta un día null (sin asignar) y rechaza uno fuera de rango", () => {
    expect(PlantillaWhatsapp.crear(base, "x").diasAntes).toBeNull();
    expect(() =>
      PlantillaWhatsapp.crear(
        { ...base, diasAntes: MAX_DIAS_ANTES_PLANTILLA + 1 },
        "x",
      ),
    ).toThrow(ErrorValidacion);
    expect(() =>
      PlantillaWhatsapp.crear({ ...base, diasAntes: -1 }, "x"),
    ).toThrow(ErrorValidacion);
  });

  it("liberarDia limpia el día asignado, y es un no-op si ya no tenía", () => {
    const sinDia = PlantillaWhatsapp.crear(base, "pla-1");
    expect(sinDia.liberarDia()).toBe(sinDia);

    const conDia = PlantillaWhatsapp.crear({ ...base, diasAntes: 3 }, "pla-2");
    expect(conDia.liberarDia().diasAntes).toBeNull();
  });
});
