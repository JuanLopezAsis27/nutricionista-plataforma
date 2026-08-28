import { describe, it, expect, vi } from "vitest";
import { ActualizarObjetivo } from "./ActualizarObjetivo";
import { ErrorObjetivoNoEncontrado } from "../../errores/ErrorObjetivoNoEncontrado";
import { mockObjetivoRepositorio, objetivoEjemplo } from "../_ayudas-test";

describe("ActualizarObjetivo", () => {
  it("actualiza los escalares preservando el estado y registra ACTUALIZACION", async () => {
    const objetivos = mockObjetivoRepositorio({
      obtenerPorId: vi.fn(async () => objetivoEjemplo()),
    });
    const casoUso = new ActualizarObjetivo(objetivos);

    const objetivo = await casoUso.ejecutar({
      id: "obj-1",
      titulo: "Bajar 4 kg",
      prioridad: "MEDIA",
    });

    expect(objetivo.titulo).toBe("Bajar 4 kg");
    expect(objetivo.estado).toBe("EN_CURSO"); // preservado
    expect(objetivos.actualizar).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tipo: "ACTUALIZACION" }),
    );
  });

  it("lanza ErrorObjetivoNoEncontrado si no existe", async () => {
    const casoUso = new ActualizarObjetivo(mockObjetivoRepositorio());
    await expect(casoUso.ejecutar({ id: "nada", titulo: "X" })).rejects.toBeInstanceOf(
      ErrorObjetivoNoEncontrado,
    );
  });

  it("permite vincular y desvincular la meta de composición", async () => {
    const original = objetivoEjemplo({ titulo: "Ordenar las cenas" });
    const objetivos = mockObjetivoRepositorio({
      obtenerPorId: vi.fn(async () => original),
      actualizar: vi.fn(async (o) => o),
    });
    const casoUso = new ActualizarObjetivo(objetivos);

    const vinculado = await casoUso.ejecutar({
      id: original.id,
      objetivoComposicionId: "meta-1",
    });
    expect(vinculado.objetivoComposicionId).toBe("meta-1");

    // null desvincula; omitirlo dejaría el vínculo como estaba.
    const suelto = await casoUso.ejecutar({
      id: original.id,
      objetivoComposicionId: null,
    });
    expect(suelto.objetivoComposicionId).toBeNull();
  });
});
