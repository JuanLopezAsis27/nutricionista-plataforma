import { describe, it, expect } from "vitest";
import { HistoriaClinica, MAXIMO_CAMPOS_EN_HISTORIA } from "./HistoriaClinica";
import { ErrorValidacion } from "../errores/ErrorValidacion";

const campo = (clave: string, valor: string) => ({
  clave,
  etiqueta: `Etiqueta ${clave}`,
  valor,
});

describe("HistoriaClinica — campos personalizados", () => {
  it("guarda los campos con su etiqueta", () => {
    const historia = HistoriaClinica.crear(
      {
        pacienteId: "pac-1",
        motivoConsulta: "Descenso de peso",
        camposPersonalizados: [campo("adherencia-ab12", "Buena")],
      },
      "hist-1",
    );

    expect(historia.camposPersonalizados).toEqual([
      {
        clave: "adherencia-ab12",
        etiqueta: "Etiqueta adherencia-ab12",
        valor: "Buena",
      },
    ]);
  });

  it("acepta una historia que SOLO tiene campos personalizados", () => {
    // El invariante de "al menos un campo con contenido" mira los dos
    // conjuntos: si mirara solo los siete fijos, una historia cargada
    // enteramente con campos del consultorio se rechazaría.
    const historia = HistoriaClinica.crear(
      {
        pacienteId: "pac-1",
        camposPersonalizados: [campo("suplementos-cd34", "Vitamina D")],
      },
      "hist-1",
    );

    expect(historia.camposPersonalizados).toHaveLength(1);
  });

  it("sigue rechazando la historia completamente vacía", () => {
    expect(() =>
      HistoriaClinica.crear(
        { pacienteId: "pac-1", camposPersonalizados: [] },
        "hist-1",
      ),
    ).toThrow(ErrorValidacion);
  });

  it("descarta los campos sin valor", () => {
    const historia = HistoriaClinica.crear(
      {
        pacienteId: "pac-1",
        motivoConsulta: "Consulta",
        camposPersonalizados: [
          campo("con-valor-11", "Algo"),
          campo("vacio-22", "   "),
        ],
      },
      "hist-1",
    );

    expect(historia.camposPersonalizados.map((c) => c.clave)).toEqual([
      "con-valor-11",
    ]);
  });

  it("unifica claves repetidas quedándose con la última", () => {
    const historia = HistoriaClinica.crear(
      {
        pacienteId: "pac-1",
        motivoConsulta: "Consulta",
        camposPersonalizados: [
          campo("dup-11", "Primero"),
          campo("dup-11", "Segundo"),
        ],
      },
      "hist-1",
    );

    expect(historia.camposPersonalizados).toHaveLength(1);
    expect(historia.camposPersonalizados[0]?.valor).toBe("Segundo");
  });

  it("rechaza más campos que el tope", () => {
    const demasiados = Array.from(
      { length: MAXIMO_CAMPOS_EN_HISTORIA + 1 },
      (_, indice) => campo(`campo-${indice}`, "valor"),
    );

    expect(() =>
      HistoriaClinica.crear(
        { pacienteId: "pac-1", camposPersonalizados: demasiados },
        "hist-1",
      ),
    ).toThrow(ErrorValidacion);
  });

  it("conserva los campos al actualizar solo un campo fijo", () => {
    const historia = HistoriaClinica.crear(
      {
        pacienteId: "pac-1",
        motivoConsulta: "Descenso de peso",
        camposPersonalizados: [campo("adherencia-ab12", "Buena")],
      },
      "hist-1",
    );

    const actualizada = historia.actualizar({ medicacion: "Levotiroxina" });

    expect(actualizada.camposPersonalizados).toEqual(
      historia.camposPersonalizados,
    );
    expect(actualizada.aPrimitivos().medicacion).toBe("Levotiroxina");
  });

  it("reemplaza los campos cuando la actualización los informa", () => {
    const historia = HistoriaClinica.crear(
      {
        pacienteId: "pac-1",
        motivoConsulta: "Descenso de peso",
        camposPersonalizados: [campo("viejo-11", "Valor")],
      },
      "hist-1",
    );

    const actualizada = historia.actualizar({
      camposPersonalizados: [campo("nuevo-22", "Otro")],
    });

    expect(actualizada.camposPersonalizados.map((c) => c.clave)).toEqual([
      "nuevo-22",
    ]);
  });

  it("aPrimitivos devuelve una copia del array", () => {
    const historia = HistoriaClinica.crear(
      {
        pacienteId: "pac-1",
        camposPersonalizados: [campo("adherencia-ab12", "Buena")],
      },
      "hist-1",
    );

    historia.aPrimitivos().camposPersonalizados.push(campo("intruso", "x"));

    expect(historia.camposPersonalizados).toHaveLength(1);
  });
});
