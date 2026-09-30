import { describe, it, expect, vi } from "vitest";
import { GuardarCampoEvolucion } from "./GuardarCampoEvolucion";
import {
  CampoEvolucion,
  MAXIMO_CAMPOS_EVOLUCION,
} from "@/dominio/entidades/CampoEvolucion";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { ErrorCampoEvolucionNoEncontrado } from "@/dominio/errores/ErrorCampoEvolucionNoEncontrado";
import { mockCampoEvolucionRepositorio } from "../_ayudas-test";

function campo(nombre: string, id: string, orden = 1): CampoEvolucion {
  return CampoEvolucion.crear({ nombre, orden }, id);
}

describe("GuardarCampoEvolucion", () => {
  it("un campo nuevo va al final de la lista", async () => {
    const repo = mockCampoEvolucionRepositorio({
      obtenerTodos: vi.fn(async () => [
        campo("Descanso", "c1", 1),
        campo("Pantalla", "c2", 5),
      ]),
    });

    const creado = await new GuardarCampoEvolucion(repo).ejecutar({
      nombre: "Hidratación",
    });

    expect(creado.orden).toBe(6);
    expect(repo.crear).toHaveBeenCalledOnce();
  });

  it("respeta el orden si se lo indica", async () => {
    const repo = mockCampoEvolucionRepositorio();

    const creado = await new GuardarCampoEvolucion(repo).ejecutar({
      nombre: "Hidratación",
      orden: 2,
    });

    expect(creado.orden).toBe(2);
  });

  it("renombrar conserva la clave del existente", async () => {
    const existente = campo("Descanso", "c1");
    const repo = mockCampoEvolucionRepositorio({
      obtenerPorId: vi.fn(async () => existente),
    });

    const editado = await new GuardarCampoEvolucion(repo).ejecutar({
      id: "c1",
      nombre: "Calidad del descanso",
    });

    expect(editado.clave).toBe(existente.clave);
    expect(repo.actualizar).toHaveBeenCalledOnce();
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("rechaza un nombre que ya usa OTRO campo", async () => {
    const repo = mockCampoEvolucionRepositorio({
      obtenerPorNombre: vi.fn(async () => campo("Descanso", "c-otro")),
    });

    await expect(
      new GuardarCampoEvolucion(repo).ejecutar({ nombre: " Descanso " }),
    ).rejects.toThrow(/Ya existe un campo de evolución llamado «Descanso»/);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("guardar un campo con su propio nombre no choca consigo mismo", async () => {
    const existente = campo("Descanso", "c1");
    const repo = mockCampoEvolucionRepositorio({
      obtenerPorNombre: vi.fn(async () => existente),
      obtenerPorId: vi.fn(async () => existente),
    });

    await expect(
      new GuardarCampoEvolucion(repo).ejecutar({
        id: "c1",
        nombre: "Descanso",
        descripcion: "Horas y calidad",
      }),
    ).resolves.toBeDefined();
  });

  it("editar uno que no existe lanza", async () => {
    const repo = mockCampoEvolucionRepositorio();

    await expect(
      new GuardarCampoEvolucion(repo).ejecutar({ id: "c-x", nombre: "Algo" }),
    ).rejects.toThrow(ErrorCampoEvolucionNoEncontrado);
  });

  it("no deja pasar del tope de campos por consultorio", async () => {
    const llenos = Array.from({ length: MAXIMO_CAMPOS_EVOLUCION }, (_, i) =>
      campo(`Campo ${i}`, `c${i}`, i),
    );
    const repo = mockCampoEvolucionRepositorio({
      obtenerTodos: vi.fn(async () => llenos),
    });

    await expect(
      new GuardarCampoEvolucion(repo).ejecutar({ nombre: "Uno más" }),
    ).rejects.toThrow(ErrorValidacion);
    expect(repo.crear).not.toHaveBeenCalled();
  });
});
