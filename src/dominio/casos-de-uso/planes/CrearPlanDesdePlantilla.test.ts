import { describe, it, expect, vi } from "vitest";
import { CrearPlanDesdePlantilla } from "./CrearPlanDesdePlantilla";
import { ErrorPlanNoEncontrado } from "../../errores/ErrorPlanNoEncontrado";
import { mockPlanRepositorio, planEjemplo } from "../_ayudas-test";

describe("CrearPlanDesdePlantilla", () => {
  it("clona en profundidad con ids nuevos y guarda el origen", async () => {
    const plantilla = planEjemplo({ esPlantilla: true }, "pla-plantilla");
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => plantilla),
    });
    const casoUso = new CrearPlanDesdePlantilla(planes);

    const clon = await casoUso.ejecutar({
      planOrigenId: "pla-plantilla",
      nombre: "Plan para Ana",
    });

    const datos = clon.aPrimitivos();
    const datosPlantilla = plantilla.aPrimitivos();
    expect(datos.id).not.toBe("pla-plantilla");
    expect(datos.nombre).toBe("Plan para Ana");
    expect(datos.esPlantilla).toBe(false);
    expect(datos.planOrigenId).toBe("pla-plantilla");
    // Mismo contenido, ids de hijos distintos.
    expect(datos.comidas).toHaveLength(datosPlantilla.comidas.length);
    expect(datos.comidas[0]!.opciones.map((o) => o.contenido)).toEqual(
      datosPlantilla.comidas[0]!.opciones.map((o) => o.contenido),
    );
    expect(datos.comidas[0]!.id).not.toBe(datosPlantilla.comidas[0]!.id);
    expect(datos.equivalencias).toHaveLength(1);
    expect(planes.crear).toHaveBeenCalledOnce();
  });

  it("lanza ErrorPlanNoEncontrado si la plantilla no existe", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new CrearPlanDesdePlantilla(planes);

    await expect(
      casoUso.ejecutar({ planOrigenId: "inexistente" }),
    ).rejects.toBeInstanceOf(ErrorPlanNoEncontrado);
  });
});
