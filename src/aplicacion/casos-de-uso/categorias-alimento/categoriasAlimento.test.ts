import { describe, it, expect, vi } from "vitest";
import { CategoriaAlimento } from "@/dominio/entidades/CategoriaAlimento";
import type { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";
import { ErrorCategoriaAlimentoDuplicada } from "@/dominio/errores/ErrorCategoriaAlimentoDuplicada";
import { ErrorCategoriaAlimentoNoEncontrada } from "@/dominio/errores/ErrorCategoriaAlimentoNoEncontrada";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockCategoriaAlimentoRepositorio,
  mockAlimentoPropioRepositorio,
} from "../_ayudas-test";
import { CrearCategoriaAlimento } from "./CrearCategoriaAlimento";
import { RenombrarCategoriaAlimento } from "./RenombrarCategoriaAlimento";
import { EliminarCategoriaAlimento } from "./EliminarCategoriaAlimento";
import { MoverCategoriaAlimento } from "./MoverCategoriaAlimento";
import { CategoriasDisponibles } from "./CategoriasDisponibles";
import { CrearAlimentoPropio } from "../nutricion/CrearAlimentoPropio";
import { ActualizarAlimentoPropio } from "../nutricion/ActualizarAlimentoPropio";

/**
 * Las categorías de alimento (migración 93): las predeterminadas las
 * administra el SUPERADMIN y un consultorio no las puede tocar; las propias
 * son de cada consultorio y no pueden llamarse como una predeterminada.
 */

function predeterminada(id: string, nombre: string, orden: number) {
  return CategoriaAlimento.crear({ nombre, orden }, false, id);
}

function armar() {
  const base = mockCategoriaAlimentoRepositorio([
    predeterminada("c-carnes", "Carnes", 1),
    predeterminada("c-lacteos", "Lácteos", 2),
    predeterminada("c-geles", "Geles deportivos", 3),
  ]);
  const propias = mockCategoriaAlimentoRepositorio();
  return { base, propias };
}

describe("categorías propias de un consultorio", () => {
  it("no pueden llamarse como una predeterminada", async () => {
    const { base, propias } = armar();
    const crear = new CrearCategoriaAlimento(propias, true, base);
    await expect(crear.ejecutar("lacteos")).rejects.toThrow(
      /ya es una categoría predeterminada/,
    );
    await crear.ejecutar("Geles con cafeína");
    await expect(crear.ejecutar("GELES CON CAFEINA")).rejects.toBeInstanceOf(
      ErrorCategoriaAlimentoDuplicada,
    );
  });

  it("una predeterminada no se renombra ni se borra desde un consultorio", async () => {
    const { base, propias } = armar();
    await expect(
      new RenombrarCategoriaAlimento(propias, base).ejecutar("c-carnes", "X"),
    ).rejects.toBeInstanceOf(ErrorCategoriaAlimentoNoEncontrada);
    await expect(
      new EliminarCategoriaAlimento(propias).ejecutar("c-carnes"),
    ).rejects.toBeInstanceOf(ErrorCategoriaAlimentoNoEncontrada);
    expect(base.eliminar).not.toHaveBeenCalled();
  });
});

describe("categorías predeterminadas", () => {
  it("una nueva va al final de la lista", async () => {
    const { base } = armar();
    const nueva = await new CrearCategoriaAlimento(base, false).ejecutar(
      "Bebidas isotónicas",
    );
    expect(nueva.orden).toBe(4);
    expect(nueva.propia).toBe(false);
  });

  it("subir y bajar renumera la lista entera", async () => {
    const { base } = armar();
    const mover = new MoverCategoriaAlimento(base);
    await mover.ejecutar("c-geles", "ARRIBA");
    expect((await base.listar()).map((c) => c.id)).toEqual([
      "c-carnes",
      "c-geles",
      "c-lacteos",
    ]);
    // En el tope no hace nada.
    await mover.ejecutar("c-carnes", "ARRIBA");
    expect((await base.listar())[0]!.id).toBe("c-carnes");
  });
});

describe("la categoría de un alimento", () => {
  it("se elige por id entre las predeterminadas y las propias", async () => {
    const { base, propias } = armar();
    const mia = await new CrearCategoriaAlimento(propias, true, base).ejecutar(
      "Mis geles",
    );
    const disponibles = new CategoriasDisponibles([base, propias]);
    const repositorio = mockAlimentoPropioRepositorio();

    const gel = await new CrearAlimentoPropio(
      repositorio,
      disponibles,
    ).ejecutar({ nombre: "Gel de cafeína", categoriaId: mia.id });
    expect(gel.aPrimitivos().categoria).toEqual({
      id: mia.id,
      nombre: "Mis geles",
      propia: true,
    });

    const leche = await new CrearAlimentoPropio(
      repositorio,
      disponibles,
    ).ejecutar({ nombre: "Leche", categoriaId: "c-lacteos" });
    expect(leche.aPrimitivos().categoria?.propia).toBe(false);
  });

  it("una categoría que no está en la lista es un error, no un alimento sin categoría", async () => {
    const { base } = armar();
    // El catálogo de la plataforma solo ve las predeterminadas: una propia
    // de un consultorio no existe para él.
    const disponibles = new CategoriasDisponibles([base]);
    await expect(
      new CrearAlimentoPropio(
        mockAlimentoPropioRepositorio(),
        disponibles,
      ).ejecutar({ nombre: "Gel", categoriaId: "c-de-un-consultorio" }),
    ).rejects.toBeInstanceOf(ErrorCategoriaAlimentoNoEncontrada);
  });

  it("al editar, sin categoría en los cambios queda la que tenía; con null se quita", async () => {
    const { base } = armar();
    const disponibles = new CategoriasDisponibles([base]);
    const repositorio = mockAlimentoPropioRepositorio({
      actualizar: vi.fn(async (a: AlimentoPropio) => a),
    });
    const alimento = await new CrearAlimentoPropio(
      repositorio,
      disponibles,
    ).ejecutar({ nombre: "Yogur", categoriaId: "c-lacteos" });
    repositorio.obtenerPorId = vi.fn(async () => alimento);
    const actualizar = new ActualizarAlimentoPropio(repositorio, disponibles);

    const igual = await actualizar.ejecutar(alimento.id, { marca: "X" });
    expect(igual.aPrimitivos().categoria?.id).toBe("c-lacteos");
    const sin = await actualizar.ejecutar(alimento.id, { categoriaId: null });
    expect(sin.aPrimitivos().categoria).toBeNull();
  });

  it("el nombre de una categoría es obligatorio y corto", () => {
    expect(() => CategoriaAlimento.crear({ nombre: "  " }, true, "x")).toThrow(
      ErrorValidacion,
    );
    expect(() =>
      CategoriaAlimento.crear({ nombre: "a".repeat(61) }, true, "x"),
    ).toThrow(ErrorValidacion);
  });
});
