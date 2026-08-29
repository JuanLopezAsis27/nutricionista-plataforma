import { describe, it, expect, vi } from "vitest";
import { ObtenerPlanesPaginado } from "./ObtenerPlanesPaginado";
import { mockPlanRepositorio } from "../_ayudas-test";

describe("ObtenerPlanesPaginado", () => {
  it("pasa el filtro de carpeta al listado Y al conteo", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new ObtenerPlanesPaginado(planes);

    await casoUso.ejecutar({
      esPlantilla: false,
      grupoId: "gru-1",
      pagina: 1,
      porPagina: 10,
    });

    // El filtro se arma campo por campo: `grupoId` faltaba en esa lista y el
    // filtro por carpeta no hacía nada, ni en la página ni en el total.
    expect(planes.listar).toHaveBeenCalledWith(
      expect.objectContaining({ grupoId: "gru-1", esPlantilla: false }),
    );
    expect(planes.contar).toHaveBeenCalledWith(
      expect.objectContaining({ grupoId: "gru-1" }),
    );
  });

  it("distingue «los sueltos» (null) de «no filtrar» (undefined)", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new ObtenerPlanesPaginado(planes);

    await casoUso.ejecutar({ grupoId: null, pagina: 1, porPagina: 10 });
    expect(planes.listar).toHaveBeenCalledWith(
      expect.objectContaining({ grupoId: null }),
    );

    vi.clearAllMocks();
    await casoUso.ejecutar({ pagina: 1, porPagina: 10 });
    expect(planes.listar).toHaveBeenCalledWith(
      expect.objectContaining({ grupoId: undefined }),
    );
  });
});
