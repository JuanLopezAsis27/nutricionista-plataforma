import { describe, it, expect, vi } from "vitest";
import { AgregarEstrategia } from "./AgregarEstrategia";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { ErrorObjetivoNoEncontrado } from "@/dominio/errores/ErrorObjetivoNoEncontrado";
import { mockObjetivoRepositorio, objetivoEjemplo } from "../_ayudas-test";

describe("AgregarEstrategia", () => {
  it("agrega la estrategia ACTIVA y registra ESTRATEGIA_AGREGADA con el motivo", async () => {
    const objetivos = mockObjetivoRepositorio({
      obtenerPorId: vi.fn(async () => objetivoEjemplo()),
    });
    const casoUso = new AgregarEstrategia(objetivos);

    const estrategia = await casoUso.ejecutar({
      objetivoId: "obj-1",
      descripcion: "Reemplazar gaseosas por agua",
      motivo: "Consume ~600 kcal diarias en bebidas azucaradas.",
    });

    expect(estrategia.estado).toBe("ACTIVA");
    expect(objetivos.agregarEstrategia).toHaveBeenCalledWith(
      "obj-1",
      expect.objectContaining({ descripcion: "Reemplazar gaseosas por agua" }),
      expect.objectContaining({
        tipo: "ESTRATEGIA_AGREGADA",
        motivo: "Consume ~600 kcal diarias en bebidas azucaradas.",
      }),
    );
  });

  it("rechaza una estrategia sin motivo (regla del dominio)", async () => {
    const objetivos = mockObjetivoRepositorio({
      obtenerPorId: vi.fn(async () => objetivoEjemplo()),
    });
    const casoUso = new AgregarEstrategia(objetivos);

    await expect(
      casoUso.ejecutar({
        objetivoId: "obj-1",
        descripcion: "Caminar 30 min",
        motivo: "  ",
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(objetivos.agregarEstrategia).not.toHaveBeenCalled();
  });

  it("lanza ErrorObjetivoNoEncontrado si el objetivo no existe", async () => {
    const casoUso = new AgregarEstrategia(mockObjetivoRepositorio());
    await expect(
      casoUso.ejecutar({ objetivoId: "nada", descripcion: "X", motivo: "Y" }),
    ).rejects.toBeInstanceOf(ErrorObjetivoNoEncontrado);
  });
});
