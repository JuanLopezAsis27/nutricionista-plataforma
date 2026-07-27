import { describe, it, expect, vi } from "vitest";
import { AnalizarFotoDeComida } from "./AnalizarFotoDeComida";
import { mockAnalisisComidaIA, mockHistorialIARepositorio } from "../_ayudas-test";

describe("AnalizarFotoDeComida", () => {
  it("delega en el analizador y persiste el resultado", async () => {
    const guardarAnalisis = vi.fn(async () => {});
    const uc = new AnalizarFotoDeComida(
      mockAnalisisComidaIA(),
      mockHistorialIARepositorio({ guardarAnalisis }),
    );

    const resultado = await uc.ejecutar({ pacienteId: "pac-1", archivoId: "arc-1" });

    expect(resultado.calorias).toBe(500);
    expect(resultado.nota).toBe("demo");
    expect(guardarAnalisis).toHaveBeenCalledOnce();
  });
});
