import { describe, it, expect } from "vitest";
import {
  planificacionSegunPerfil,
  planificacionesQueHay,
  textoSinPlanificacion,
} from "./segunPerfil";
import { formularioVacio } from "./formulario/esquema";

/**
 * Lo que la ficha le ofrece a un paciente según el deporte de su perfil
 * (migración 98): la decisión es del deporte, que configura el SUPERADMIN.
 */
describe("planificacionSegunPerfil", () => {
  it("sin perfil, se puede planificar eligiendo a mano", () => {
    expect(planificacionSegunPerfil(null)).toEqual({ estado: "SIN_PERFIL" });
  });

  it("un deporte con planificación arranca con la suya", () => {
    const r = planificacionSegunPerfil({
      deporte: {
        id: "d1",
        nombre: "Trail running",
        formatoPlanificacion: "CARRERA_TRAIL",
      },
    });
    expect(r.estado).toBe("DISPONIBLE");
    if (r.estado !== "DISPONIBLE") return;
    expect(r.definicion.tipo).toBe("CARRERA");
    expect(r.definicion.carrera?.modalidad).toBe("TRAIL");
    // Y el formulario arranca así.
    expect(
      formularioVacio("", null, r.definicion.carrera!.modalidad).modalidad,
    ).toBe("TRAIL");
  });

  it("un deporte sin planificación no la ofrece, y lo dice", () => {
    const r = planificacionSegunPerfil({
      deporte: { id: "d2", nombre: "Fútbol", formatoPlanificacion: null },
    });
    expect(r).toEqual({ estado: "NO_DISPONIBLE", deporte: "Fútbol" });
    expect(textoSinPlanificacion("Fútbol")).toContain("«Fútbol»");
    expect(planificacionesQueHay()).toBe("Running (calle) y Trail running");
  });
});
