import { describe, it, expect, vi } from "vitest";
import { CrearPlanDesdePlantilla } from "./CrearPlanDesdePlantilla";
import { ErrorPlanNoEncontrado } from "../../errores/ErrorPlanNoEncontrado";
import { ErrorPlanDuplicado } from "../../errores/ErrorPlanDuplicado";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
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

  it("numera el nombre del clon cuando el de la plantilla ya está tomado", async () => {
    const plantilla = planEjemplo({ esPlantilla: true }, "pla-plantilla");
    // "Plan descenso" y "Plan descenso (2)" tomados; libre a partir del (3).
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => plantilla),
      existeNombre: vi.fn(async (nombre: string) => !nombre.endsWith("(3)")),
    });
    const casoUso = new CrearPlanDesdePlantilla(planes);

    const clon = await casoUso.ejecutar({ planOrigenId: "pla-plantilla" });

    // Clonar es un clic sin formulario: fallar por nombre repetido dejaría el
    // botón inservible a partir del segundo uso de la misma plantilla.
    expect(clon.nombre).toBe("Plan descenso (3)");
  });

  it("NO numera un nombre escrito a mano: avisa que está tomado", async () => {
    const plantilla = planEjemplo({ esPlantilla: true }, "pla-plantilla");
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => plantilla),
      existeNombre: vi.fn(async () => true),
    });
    const casoUso = new CrearPlanDesdePlantilla(planes);

    await expect(
      casoUso.ejecutar({
        planOrigenId: "pla-plantilla",
        nombre: "Plan para Ana",
      }),
    ).rejects.toBeInstanceOf(ErrorPlanDuplicado);
    expect(planes.crear).not.toHaveBeenCalled();
  });

  it("no deja usar un plan en PDF como plantilla", async () => {
    const enPdf = planEjemplo(
      { modalidad: "PDF", comidas: [], archivoPrincipalId: "arc-1" },
      "pla-pdf",
    );
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => enPdf),
    });
    const casoUso = new CrearPlanDesdePlantilla(planes);

    // El archivo es de UN plan: el clon quedaría sin nada que mostrar.
    await expect(
      casoUso.ejecutar({ planOrigenId: "pla-pdf" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(planes.crear).not.toHaveBeenCalled();
  });
});
