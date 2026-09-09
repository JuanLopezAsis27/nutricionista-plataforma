import { describe, it, expect, vi } from "vitest";
import { EliminarEstrategia } from "./EliminarEstrategia";
import { Objetivo } from "@/dominio/entidades/Objetivo";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { mockObjetivoRepositorio, objetivoEjemplo } from "../_ayudas-test";

function objetivoConEstrategia(): Objetivo {
  return Objetivo.reconstruir({
    ...objetivoEjemplo().aPrimitivos(),
    estrategias: [
      {
        id: "est-1",
        descripcion: "Caminar 30 min",
        motivo: "Sedentarismo",
        estado: "ACTIVA",
        creadoEn: new Date("2026-07-01"),
      },
    ],
  });
}

describe("EliminarEstrategia", () => {
  it("elimina la estrategia y registra ESTRATEGIA_ELIMINADA", async () => {
    const objetivos = mockObjetivoRepositorio({
      obtenerPorId: vi.fn(async () => objetivoConEstrategia()),
    });
    const casoUso = new EliminarEstrategia(objetivos);

    await casoUso.ejecutar({ objetivoId: "obj-1", estrategiaId: "est-1" });

    expect(objetivos.eliminarEstrategia).toHaveBeenCalledWith(
      "obj-1",
      "est-1",
      expect.objectContaining({ tipo: "ESTRATEGIA_ELIMINADA" }),
    );
  });

  it("rechaza una estrategia que no pertenece al objetivo", async () => {
    const objetivos = mockObjetivoRepositorio({
      obtenerPorId: vi.fn(async () => objetivoConEstrategia()),
    });
    const casoUso = new EliminarEstrategia(objetivos);

    await expect(
      casoUso.ejecutar({ objetivoId: "obj-1", estrategiaId: "ajena" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(objetivos.eliminarEstrategia).not.toHaveBeenCalled();
  });
});
