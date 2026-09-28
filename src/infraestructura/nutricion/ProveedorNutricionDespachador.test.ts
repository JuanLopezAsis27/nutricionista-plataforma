import { describe, it, expect, vi } from "vitest";
import type {
  IProveedorDatosNutricionales,
  AlimentoNutricional,
} from "@/dominio/servicios/IProveedorDatosNutricionales";
import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import { ProveedorNutricionDespachador } from "./ProveedorNutricionDespachador";

/**
 * Tests del despachador de la búsqueda de alimentos: la lista del consultorio
 * y la predeterminada de la plataforma se buscan JUNTAS (la del consultorio
 * primero) y, si las dos están vacías, se sale a la fuente externa.
 */

const alimento = (nombre: string, fuente: string): AlimentoNutricional => ({
  nombre,
  marca: null,
  referenciaExterna: null,
  fuente,
  caloriasPor100: 100,
  proteinasPor100: null,
  carbohidratosPor100: null,
  grasasPor100: null,
  id: null,
  categoria: null,
  imagenVersion: null,
});

function proveedor(resultados: AlimentoNutricional[]) {
  const buscar = vi.fn(async () => resultados);
  const instancia: IProveedorDatosNutricionales = { buscar };
  return { instancia, buscar };
}

function repositorio(cantidad: number): IAlimentoPropioRepositorio {
  return {
    contar: vi.fn(async () => cantidad),
  } as unknown as IAlimentoPropioRepositorio;
}

describe("ProveedorNutricionDespachador", () => {
  it("combina las dos listas, la del consultorio primero y sin repetidos", async () => {
    const propio = proveedor([alimento("Yogur", "PROPIO")]);
    const base = proveedor([
      alimento("yogur", "BASE"),
      alimento("Yogur griego", "BASE"),
    ]);
    const externo = proveedor([]);
    const despachador = new ProveedorNutricionDespachador(
      [
        { proveedor: propio.instancia, repositorio: repositorio(3) },
        { proveedor: base.instancia, repositorio: repositorio(500) },
      ],
      externo.instancia,
    );

    const resultado = await despachador.buscar("yog", 10);
    expect(resultado.map((a) => `${a.nombre}/${a.fuente}`)).toEqual([
      "Yogur/PROPIO",
      "Yogur griego/BASE",
    ]);
    expect(externo.buscar).not.toHaveBeenCalled();
  });

  it("oculta el de la plataforma que coincide con uno propio aunque cambien tildes y espacios", async () => {
    const despachador = new ProveedorNutricionDespachador(
      [
        {
          proveedor: proveedor([alimento("Yogur", "PROPIO")]).instancia,
          repositorio: repositorio(1),
        },
        {
          proveedor: proveedor([alimento("Yógur ", "BASE")]).instancia,
          repositorio: repositorio(1),
        },
      ],
      proveedor([]).instancia,
    );
    const resultado = await despachador.buscar("yog");
    expect(resultado.map((a) => a.fuente)).toEqual(["PROPIO"]);
  });

  it("con solo el catálogo de la plataforma cargado, no sale a internet", async () => {
    const externo = proveedor([]);
    const despachador = new ProveedorNutricionDespachador(
      [
        { proveedor: proveedor([]).instancia, repositorio: repositorio(0) },
        {
          proveedor: proveedor([alimento("Arroz", "BASE")]).instancia,
          repositorio: repositorio(10),
        },
      ],
      externo.instancia,
    );
    expect(await despachador.buscar("arr")).toHaveLength(1);
    expect(externo.buscar).not.toHaveBeenCalled();
  });

  it("si las dos listas están vacías, busca en la fuente externa", async () => {
    const externo = proveedor([alimento("Rice", "OFF")]);
    const despachador = new ProveedorNutricionDespachador(
      [
        { proveedor: proveedor([]).instancia, repositorio: repositorio(0) },
        { proveedor: proveedor([]).instancia, repositorio: repositorio(0) },
      ],
      externo.instancia,
    );
    expect(await despachador.buscar("rice")).toEqual([alimento("Rice", "OFF")]);
  });
});
