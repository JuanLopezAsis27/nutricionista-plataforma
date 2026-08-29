import { describe, it, expect, vi } from "vitest";
import { ActualizarAntropometria } from "./ActualizarAntropometria";
import { ErrorAntropometriaNoEncontrada } from "../../errores/ErrorAntropometriaNoEncontrada";
import { ErrorAntropometriaDuplicada } from "../../errores/ErrorAntropometriaDuplicada";
import {
  mockAntropometriaRepositorio,
  antropometriaEjemplo,
} from "../_ayudas-test";

describe("ActualizarAntropometria", () => {
  it("actualiza la medición existente", async () => {
    const antropometrias = mockAntropometriaRepositorio({
      obtenerPorId: vi.fn(async () => antropometriaEjemplo()),
    });
    const casoUso = new ActualizarAntropometria(antropometrias);

    const medicion = await casoUso.ejecutar("ant-1", { pesoKg: 79 });

    expect(medicion.pesoKg).toBe(79);
    expect(antropometrias.actualizar).toHaveBeenCalledOnce();
  });

  it("rechaza si la medición no existe", async () => {
    const casoUso = new ActualizarAntropometria(mockAntropometriaRepositorio());
    await expect(
      casoUso.ejecutar("no-existe", { pesoKg: 79 }),
    ).rejects.toBeInstanceOf(ErrorAntropometriaNoEncontrada);
  });

  it("rechaza mover la medición a una fecha ya ocupada", async () => {
    const antropometrias = mockAntropometriaRepositorio({
      obtenerPorId: vi.fn(async () => antropometriaEjemplo()),
      existeEnFecha: vi.fn(async () => true),
    });
    const casoUso = new ActualizarAntropometria(antropometrias);

    await expect(
      casoUso.ejecutar("ant-1", { fecha: new Date("2026-06-01") }),
    ).rejects.toBeInstanceOf(ErrorAntropometriaDuplicada);
    expect(antropometrias.existeEnFecha).toHaveBeenCalledWith(
      "pac-1",
      new Date("2026-06-01"),
      "ant-1",
    );
  });
});
