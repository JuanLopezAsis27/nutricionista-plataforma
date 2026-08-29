import { describe, it, expect, vi } from "vitest";
import { CambiarEstadoEstrategia } from "./CambiarEstadoEstrategia";
import { Objetivo } from "../../entidades/Objetivo";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import { mockObjetivoRepositorio, objetivoEjemplo } from "../_ayudas-test";

function objetivoConEstrategia(): Objetivo {
  return Objetivo.reconstruir({
    ...objetivoEjemplo().aPrimitivos(),
    estrategias: [
      {
        id: "est-1",
        descripcion: "Caminar 30 min",
        motivo: "Sedentarismo marcado",
        estado: "ACTIVA",
        creadoEn: new Date("2026-07-01"),
      },
    ],
  });
}

describe("CambiarEstadoEstrategia", () => {
  it("cambia el estado y registra ESTRATEGIA_CAMBIO_ESTADO con motivo", async () => {
    const objetivos = mockObjetivoRepositorio({
      obtenerPorId: vi.fn(async () => objetivoConEstrategia()),
    });
    const casoUso = new CambiarEstadoEstrategia(objetivos);

    const estrategia = await casoUso.ejecutar({
      objetivoId: "obj-1",
      estrategiaId: "est-1",
      estado: "LOGRADA",
      motivo: "Camina a diario hace un mes.",
    });

    expect(estrategia.estado).toBe("LOGRADA");
    expect(objetivos.actualizarEstrategia).toHaveBeenCalledWith(
      "obj-1",
      expect.objectContaining({ id: "est-1", estado: "LOGRADA" }),
      expect.objectContaining({
        tipo: "ESTRATEGIA_CAMBIO_ESTADO",
        motivo: "Camina a diario hace un mes.",
      }),
    );
  });

  it("rechaza el cambio sin motivo", async () => {
    const objetivos = mockObjetivoRepositorio({
      obtenerPorId: vi.fn(async () => objetivoConEstrategia()),
    });
    const casoUso = new CambiarEstadoEstrategia(objetivos);

    await expect(
      casoUso.ejecutar({
        objetivoId: "obj-1",
        estrategiaId: "est-1",
        estado: "LOGRADA",
        motivo: "",
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(objetivos.actualizarEstrategia).not.toHaveBeenCalled();
  });

  it("rechaza una estrategia que no pertenece al objetivo", async () => {
    const objetivos = mockObjetivoRepositorio({
      obtenerPorId: vi.fn(async () => objetivoConEstrategia()),
    });
    const casoUso = new CambiarEstadoEstrategia(objetivos);

    await expect(
      casoUso.ejecutar({
        objetivoId: "obj-1",
        estrategiaId: "ajena",
        estado: "LOGRADA",
        motivo: "x",
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});
