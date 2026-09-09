import { describe, it, expect } from "vitest";
import { Evolucion } from "./Evolucion";
import { ErrorValidacion } from "../errores/ErrorValidacion";

const AHORA = new Date("2026-09-04T12:00:00Z");
const BASE = {
  pacienteId: "pac-1",
  fecha: new Date("2024-07-12T00:00:00Z"),
};

describe("Evolucion", () => {
  it("guarda el texto del campo tal como se escribió", () => {
    // El motivo es la mitad del dato: "50%" solo no dice por qué.
    const evolucion = Evolucion.crear(
      {
        ...BASE,
        cumplimientoDieta: "50%. 10 días no respetó por viaje.",
        descanso: "7 hs.",
      },
      "evo-1",
      AHORA,
    );

    expect(evolucion.aPrimitivos().cumplimientoDieta).toBe(
      "50%. 10 días no respetó por viaje.",
    );
    expect(evolucion.aPrimitivos().descanso).toBe("7 hs.");
    // Lo que no se cargó queda en null, no en cadena vacía.
    expect(evolucion.aPrimitivos().orina).toBeNull();
  });

  it("rechaza una evolución sin un solo campo con contenido", () => {
    expect(() =>
      Evolucion.crear({ ...BASE, entrenamiento: "   " }, "evo-1", AHORA),
    ).toThrow(ErrorValidacion);
  });

  it("una evolución cargada SOLO con campos personalizados tiene contenido", () => {
    // El invariante mira los dos conjuntos: si no, un consultorio que sigue lo
    // suyo no podría guardar nada.
    const evolucion = Evolucion.crear(
      {
        ...BASE,
        camposPersonalizados: [
          { clave: "supl-1234abcd", etiqueta: "Suplementación", valor: "Mg" },
        ],
      },
      "evo-1",
      AHORA,
    );
    expect(evolucion.camposPersonalizados).toHaveLength(1);
  });

  it("rechaza una fecha futura", () => {
    expect(() =>
      Evolucion.crear(
        {
          ...BASE,
          fecha: new Date("2026-09-05T00:00:00Z"),
          descanso: "7 hs",
        },
        "evo-1",
        AHORA,
      ),
    ).toThrow(/futura/);
  });

  it("descarta los campos personalizados vacíos y unifica claves repetidas", () => {
    const evolucion = Evolucion.crear(
      {
        ...BASE,
        descanso: "7 hs",
        camposPersonalizados: [
          { clave: "a-1", etiqueta: "Uno", valor: "  " },
          { clave: "b-1", etiqueta: "Dos", valor: "primero" },
          { clave: "b-1", etiqueta: "Dos", valor: "gana el último" },
        ],
      },
      "evo-1",
      AHORA,
    );

    expect(evolucion.camposPersonalizados).toEqual([
      { clave: "b-1", etiqueta: "Dos", valor: "gana el último" },
    ]);
  });

  it("actualizar revalida y conserva id, paciente y creadoEn", () => {
    const original = Evolucion.crear(
      { ...BASE, descanso: "7 hs" },
      "evo-1",
      AHORA,
    );
    const despues = new Date("2026-09-04T18:00:00Z");

    const editada = original.actualizar({ descanso: "8 hs" }, despues);

    expect(editada.id).toBe("evo-1");
    expect(editada.pacienteId).toBe("pac-1");
    expect(editada.aPrimitivos().creadoEn).toEqual(AHORA);
    expect(editada.aPrimitivos().actualizadoEn).toEqual(despues);
    expect(editada.aPrimitivos().descanso).toBe("8 hs");
  });

  it("actualizar no borra los campos que no se tocaron", () => {
    const original = Evolucion.crear(
      { ...BASE, descanso: "7 hs", orina: "clarito" },
      "evo-1",
      AHORA,
    );

    const editada = original.actualizar({ descanso: "8 hs" });

    expect(editada.aPrimitivos().orina).toBe("clarito");
  });
});
