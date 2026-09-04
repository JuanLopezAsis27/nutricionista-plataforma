import { describe, it, expect } from "vitest";
import { normalizarLectura } from "./InterpretadorHistoriaClinicaLLM";

const SIN_CAMPOS_PROPIOS: never[] = [];

describe("normalizarLectura", () => {
  it("separa la historia clínica de las evoluciones", () => {
    const { campos, evoluciones } = normalizarLectura(
      {
        historiaClinica: { motivoConsulta: "  descenso de peso  " },
        evoluciones: [
          { fecha: "2024-07-12", cumplimientoDieta: "50%. 10 días no." },
        ],
      },
      SIN_CAMPOS_PROPIOS,
    );

    expect(campos.motivoConsulta).toBe("descenso de peso");
    expect(campos.diagnosticos).toBeNull();
    expect(evoluciones).toHaveLength(1);
    expect(evoluciones[0]?.cumplimientoDieta).toBe("50%. 10 días no.");
  });

  it("ordena las evoluciones por fecha y manda al final las que no la tienen", () => {
    const { evoluciones } = normalizarLectura(
      {
        evoluciones: [
          { fecha: null, descanso: "7 hs" },
          { fecha: "2024-08-09", descanso: "8 hs" },
          { fecha: "2024-07-12", descanso: "6 hs" },
        ],
      },
      SIN_CAMPOS_PROPIOS,
    );

    expect(evoluciones.map((e) => e.fecha)).toEqual([
      "2024-07-12",
      "2024-08-09",
      null,
    ]);
  });

  it("descarta la evolución sin un solo campo cargado", () => {
    // La entidad la rechazaría, y una fila vacía en la revisión es ruido.
    const { evoluciones } = normalizarLectura(
      {
        evoluciones: [
          { fecha: "2024-07-12" },
          { fecha: "2024-08-09", orina: "clarito" },
        ],
      },
      SIN_CAMPOS_PROPIOS,
    );

    expect(evoluciones).toHaveLength(1);
    expect(evoluciones[0]?.orina).toBe("clarito");
  });

  it("descarta una fecha malformada en vez de arrastrarla", () => {
    const { evoluciones } = normalizarLectura(
      { evoluciones: [{ fecha: "12/07/2024", descanso: "7 hs" }] },
      SIN_CAMPOS_PROPIOS,
    );

    expect(evoluciones[0]?.fecha).toBeNull();
  });

  it("recoge los campos propios del consultorio con su etiqueta", () => {
    // El valor viaja con la etiqueta, no solo con la clave: si mañana se borra
    // la definición, la evolución se sigue leyendo.
    const { evoluciones } = normalizarLectura(
      {
        evoluciones: [
          { fecha: "2024-07-12", "supl-1234abcd": "Magnesio por la noche" },
        ],
      },
      [
        {
          clave: "supl-1234abcd",
          etiqueta: "Suplementación",
          descripcion: null,
        },
      ],
    );

    expect(evoluciones[0]?.camposPersonalizados).toEqual([
      {
        clave: "supl-1234abcd",
        etiqueta: "Suplementación",
        valor: "Magnesio por la noche",
      },
    ]);
  });

  it("ignora las claves que el modelo inventó", () => {
    // El esquema es una instrucción al modelo, no una garantía.
    const { evoluciones } = normalizarLectura(
      {
        evoluciones: [
          {
            fecha: "2024-07-12",
            descanso: "7 hs",
            pesoKg: 82,
            comentarioLibre: "algo",
          },
        ],
      },
      SIN_CAMPOS_PROPIOS,
    );

    expect(evoluciones[0]).not.toHaveProperty("pesoKg");
    expect(evoluciones[0]).not.toHaveProperty("comentarioLibre");
  });

  it("devuelve todo vacío si el modelo no mandó nada", () => {
    const lectura = normalizarLectura({}, SIN_CAMPOS_PROPIOS);
    expect(lectura.evoluciones).toEqual([]);
    expect(lectura.campos.motivoConsulta).toBeNull();
  });
});
