import { describe, it, expect } from "vitest";
import { CampoEvolucion } from "./CampoEvolucion";
import { ErrorValidacion } from "../errores/ErrorValidacion";

describe("CampoEvolucion", () => {
  it("deriva la clave del nombre al crearlo y limpia los espacios", () => {
    const campo = CampoEvolucion.crear(
      { nombre: "  Horas de pantalla  ", descripcion: "   " },
      "campo-1",
    );

    expect(campo.clave).toMatch(/^horas-de-pantalla-[0-9a-f]{8}$/);
    expect(campo.nombre).toBe("Horas de pantalla");
    expect(campo.descripcion).toBeNull();
  });

  it("NO cambia la clave al renombrar el campo", () => {
    // La clave es lo que ata el campo a los valores ya cargados en cada
    // evolución: moverla vaciaría ese campo en todas las fichas.
    const campo = CampoEvolucion.crear({ nombre: "Descanso" }, "campo-1");

    const renombrado = campo.actualizar({ nombre: "Calidad del descanso" });

    expect(renombrado.clave).toBe(campo.clave);
    expect(renombrado.nombre).toBe("Calidad del descanso");
  });

  it("conserva lo que no se edita y deja vaciar la descripción", () => {
    const campo = CampoEvolucion.crear(
      { nombre: "Pantalla", descripcion: "Horas por día", orden: 4 },
      "campo-1",
    );

    expect(campo.actualizar({ nombre: "Pantallas" }).descripcion).toBe(
      "Horas por día",
    );
    expect(campo.actualizar({ nombre: "Pantallas" }).orden).toBe(4);
    expect(campo.actualizar({ descripcion: null }).descripcion).toBeNull();
  });

  it("es inmutable: actualizar devuelve otra instancia", () => {
    const campo = CampoEvolucion.crear({ nombre: "Descanso" }, "campo-1");

    campo.actualizar({ nombre: "Sueño" });

    expect(campo.nombre).toBe("Descanso");
  });

  it("exige un nombre de hasta 80 caracteres, al crear y al renombrar", () => {
    expect(() => CampoEvolucion.crear({ nombre: "   " }, "c")).toThrow(
      ErrorValidacion,
    );
    expect(() => CampoEvolucion.crear({ nombre: "x".repeat(81) }, "c")).toThrow(
      ErrorValidacion,
    );

    const campo = CampoEvolucion.crear({ nombre: "Descanso" }, "c");
    expect(() => campo.actualizar({ nombre: "" })).toThrow(ErrorValidacion);
  });
});
