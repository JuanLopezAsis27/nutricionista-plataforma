import { describe, it, expect } from "vitest";
import { normalizarMediciones } from "./InterpretadorMedicionesLLM";

describe("normalizarMediciones", () => {
  it("queda con las mediciones y las ordena por fecha", async () => {
    const { mediciones, nombreEnPlanilla } = normalizarMediciones({
      nombreEnPlanilla: "  Alderete Jorgelina  ",
      mediciones: [
        { fecha: "2024-04-12", pesoKg: 84.7, pliegueTricipital: 35 },
        { fecha: "2024-03-15", pesoKg: 87.3, pliegueTricipital: 35 },
      ],
    });

    expect(nombreEnPlanilla).toBe("Alderete Jorgelina");
    expect(mediciones.map((m) => m.fecha)).toEqual([
      "2024-03-15",
      "2024-04-12",
    ]);
  });

  it("descarta la columna sin peso", async () => {
    // La entidad `Antropometria` exige el peso: una columna con dos pliegues
    // sueltos no se puede registrar ni calcula nada, así que no se ofrece.
    const { mediciones } = normalizarMediciones({
      mediciones: [
        { fecha: "2024-03-15", pesoKg: null, pliegueTricipital: 35 },
        { fecha: "2024-04-12", pesoKg: 84.7 },
      ],
    });

    expect(mediciones).toHaveLength(1);
    expect(mediciones[0]?.pesoKg).toBe(84.7);
  });

  it("conserva la medición sin fecha y la manda al final", async () => {
    // La fecha la completa el profesional en la revisión; descartarla acá
    // perdería una consulta que la planilla sí tenía cargada.
    const { mediciones } = normalizarMediciones({
      mediciones: [
        { fecha: null, pesoKg: 80 },
        { fecha: "2024-03-15", pesoKg: 87.3 },
      ],
    });

    expect(mediciones.map((m) => m.fecha)).toEqual(["2024-03-15", null]);
  });

  it("descarta una fecha malformada en vez de arrastrarla", async () => {
    const { mediciones } = normalizarMediciones({
      mediciones: [{ fecha: "15/03/2024", pesoKg: 87.3 }],
    });

    expect(mediciones[0]?.fecha).toBeNull();
  });

  it("ignora los campos que no son medidas conocidas", async () => {
    // El esquema es una instrucción al modelo, no una garantía: lo que
    // inventó no puede llegar al historial de un paciente.
    const { mediciones } = normalizarMediciones({
      mediciones: [
        {
          fecha: "2024-03-15",
          pesoKg: 87.3,
          sumatoria6Pliegues: 244,
          porcentajeGraso: 42,
          pliegueTricipital: "35",
        },
      ],
    });

    expect(mediciones[0]).not.toHaveProperty("sumatoria6Pliegues");
    expect(mediciones[0]).not.toHaveProperty("porcentajeGraso");
    // Un número mandado como texto tampoco se acepta.
    expect(mediciones[0]?.pliegueTricipital).toBeUndefined();
  });

  it("devuelve lista vacía si el modelo no mandó mediciones", async () => {
    expect(normalizarMediciones({}).mediciones).toEqual([]);
    expect(normalizarMediciones({}).nombreEnPlanilla).toBeNull();
  });
});
