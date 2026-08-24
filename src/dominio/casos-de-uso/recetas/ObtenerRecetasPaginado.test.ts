import { describe, it, expect, vi } from "vitest";
import { ObtenerRecetasPaginado } from "./ObtenerRecetasPaginado";
import { mockRecetaRepositorio } from "../_ayudas-test";

describe("ObtenerRecetasPaginado", () => {
  it("trae SOLO la página pedida (limite/desplazamiento) y calcula el total de páginas", async () => {
    const listar = vi.fn(async () => []);
    const contar = vi.fn(async () => 23);
    const uc = new ObtenerRecetasPaginado(mockRecetaRepositorio({ listar, contar }));

    const r = await uc.ejecutar({ pagina: 3, porPagina: 10, texto: "arroz" });

    // Página 3 de 10 → offset 20, trae 10.
    expect(listar).toHaveBeenCalledWith({
      texto: "arroz",
      etiqueta: undefined,
      limite: 10,
      desplazamiento: 20,
    });
    // El contador ignora la paginación (mismo filtro, sin limite/offset).
    expect(contar).toHaveBeenCalledWith({ texto: "arroz", etiqueta: undefined });
    expect(r.total).toBe(23);
    expect(r.paginas).toBe(3); // ceil(23 / 10)
  });

  it("primera página → offset 0", async () => {
    const listar = vi.fn(async () => []);
    const uc = new ObtenerRecetasPaginado(
      mockRecetaRepositorio({ listar, contar: vi.fn(async () => 0) }),
    );

    await uc.ejecutar({ pagina: 1, porPagina: 10 });

    expect(listar).toHaveBeenCalledWith(
      expect.objectContaining({ limite: 10, desplazamiento: 0 }),
    );
  });
});
