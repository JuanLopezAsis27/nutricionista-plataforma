import { describe, it, expect } from "vitest";
import { filtrarAlimentos } from "./filtrarAlimentos";
import type {
  AlimentoNutricional,
  CriterioAlimentos,
} from "@/dominio/servicios/IProveedorDatosNutricionales";

function alimento(p: Partial<AlimentoNutricional>): AlimentoNutricional {
  return {
    nombre: "Genérico",
    marca: null,
    referenciaExterna: null,
    fuente: "FATSECRET",
    caloriasPor100: 100,
    proteinasPor100: 10,
    carbohidratosPor100: 10,
    grasasPor100: 5,
    ...p,
  };
}

const base: CriterioAlimentos = {
  excluirMarcas: false,
  requiereMacros: false,
  maxCaloriasPor100: null,
  excluirTexto: [],
};

describe("filtrarAlimentos", () => {
  it("sin criterio devuelve todo", () => {
    const lista = [alimento({}), alimento({ marca: "Marca" })];
    expect(filtrarAlimentos(lista, undefined)).toHaveLength(2);
  });

  it("excluirMarcas deja solo los genéricos", () => {
    const lista = [alimento({ nombre: "A" }), alimento({ nombre: "B", marca: "Coca" })];
    const r = filtrarAlimentos(lista, { ...base, excluirMarcas: true });
    expect(r.map((a) => a.nombre)).toEqual(["A"]);
  });

  it("requiereMacros descarta los que no tienen los 4", () => {
    const lista = [alimento({ nombre: "Completo" }), alimento({ nombre: "Sin", proteinasPor100: null })];
    const r = filtrarAlimentos(lista, { ...base, requiereMacros: true });
    expect(r.map((a) => a.nombre)).toEqual(["Completo"]);
  });

  it("maxCaloriasPor100 descarta los que superan el tope", () => {
    const lista = [alimento({ nombre: "Liviano", caloriasPor100: 200 }), alimento({ nombre: "Pesado", caloriasPor100: 500 })];
    const r = filtrarAlimentos(lista, { ...base, maxCaloriasPor100: 300 });
    expect(r.map((a) => a.nombre)).toEqual(["Liviano"]);
  });

  it("excluirTexto descarta por coincidencia en el nombre (case-insensitive)", () => {
    const lista = [alimento({ nombre: "Papa hervida" }), alimento({ nombre: "Papa FRITA" })];
    const r = filtrarAlimentos(lista, { ...base, excluirTexto: ["frita"] });
    expect(r.map((a) => a.nombre)).toEqual(["Papa hervida"]);
  });

  it("combina varios criterios", () => {
    const lista = [
      alimento({ nombre: "Arroz", caloriasPor100: 130 }),
      alimento({ nombre: "Arroz frito", caloriasPor100: 150 }),
      alimento({ nombre: "Arroz marca", marca: "Gallo", caloriasPor100: 130 }),
      alimento({ nombre: "Arroz calórico", caloriasPor100: 900 }),
    ];
    const r = filtrarAlimentos(lista, {
      excluirMarcas: true,
      requiereMacros: true,
      maxCaloriasPor100: 400,
      excluirTexto: ["frito"],
    });
    expect(r.map((a) => a.nombre)).toEqual(["Arroz"]);
  });
});
