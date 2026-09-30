import { describe, it, expect, vi } from "vitest";
import { Receta } from "@/dominio/entidades/Receta";
import type { IRecetaBaseRepositorio } from "@/dominio/repositorios/IRecetaBaseRepositorio";
import { ErrorRecetaNoEncontrada } from "@/dominio/errores/ErrorRecetaNoEncontrada";
import { CrearRecetaBase } from "./CrearRecetaBase";
import { ActualizarRecetaBase } from "./ActualizarRecetaBase";
import { EliminarRecetaBase } from "./EliminarRecetaBase";

/**
 * Alta, edición y baja de las recetas del catálogo de la plataforma. Que editar
 * o borrar la de la plataforma NO toque las copias de los consultorios lo
 * sostiene el esquema (copia + FK SET NULL), no estos casos de uso: acá se
 * verifica que solo escriban en el catálogo.
 */

const datos = {
  nombre: "Budín de avena",
  porciones: 4,
  etiquetas: ["sin azúcar"],
  ingredientes: [{ nombre: "Avena", cantidadGramos: 200, caloriasPor100: 380 }],
};

function catalogo(receta: Receta | null = null): IRecetaBaseRepositorio {
  return {
    crear: vi.fn(async (r: Receta) => r),
    actualizar: vi.fn(async (r: Receta) => r),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => receta),
    listar: vi.fn(async () => []),
    contar: vi.fn(async () => 0),
    listarEtiquetas: vi.fn(async () => []),
  };
}

describe("CrearRecetaBase", () => {
  it("crea la receta con los macros por porción calculados de sus ingredientes", async () => {
    const repo = catalogo();

    const receta = await new CrearRecetaBase(repo).ejecutar(datos);

    expect(repo.crear).toHaveBeenCalledOnce();
    expect(receta.nombre).toBe("Budín de avena");
    // 200 g × 380 kcal/100 g = 760 kcal, en 4 porciones.
    expect(receta.aPrimitivos().calorias).toBeCloseTo(190);
  });
});

describe("ActualizarRecetaBase", () => {
  it("edita la del catálogo conservando su id", async () => {
    const repo = catalogo(Receta.crear(datos, "base-1"));

    const editada = await new ActualizarRecetaBase(repo).ejecutar("base-1", {
      ...datos,
      nombre: "Budín de avena y banana",
    });

    expect(editada.id).toBe("base-1");
    expect(editada.nombre).toBe("Budín de avena y banana");
    expect(repo.actualizar).toHaveBeenCalledOnce();
  });

  it("lanza si no existe, sin escribir", async () => {
    const repo = catalogo(null);

    await expect(
      new ActualizarRecetaBase(repo).ejecutar("base-x", datos),
    ).rejects.toThrow(ErrorRecetaNoEncontrada);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });
});

describe("EliminarRecetaBase", () => {
  it("borra la del catálogo", async () => {
    const repo = catalogo(Receta.crear(datos, "base-1"));

    await new EliminarRecetaBase(repo).ejecutar("base-1");

    expect(repo.eliminar).toHaveBeenCalledWith("base-1");
  });

  it("lanza si no existe, sin borrar", async () => {
    const repo = catalogo(null);

    await expect(
      new EliminarRecetaBase(repo).ejecutar("base-x"),
    ).rejects.toThrow(ErrorRecetaNoEncontrada);
    expect(repo.eliminar).not.toHaveBeenCalled();
  });
});
