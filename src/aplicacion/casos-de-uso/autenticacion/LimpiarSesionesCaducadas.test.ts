import { describe, it, expect, vi } from "vitest";
import { LimpiarSesionesCaducadas } from "./LimpiarSesionesCaducadas";
import { mockTokenRefrescoRepositorio, mockReloj } from "../_ayudas-test";

describe("LimpiarSesionesCaducadas", () => {
  it("borra lo vencido o revocado hace más que el margen, no lo reciente", async () => {
    const eliminarCaducados = vi.fn(async () => 7);
    const uc = new LimpiarSesionesCaducadas(
      mockTokenRefrescoRepositorio({ eliminarCaducados }),
      mockReloj(new Date("2026-09-17T04:30:00Z")),
      30,
    );

    const borrados = await uc.ejecutar();

    expect(borrados).toBe(7);
    // 30 días antes: un token que venció ayer todavía puede delatar un robo.
    expect(eliminarCaducados).toHaveBeenCalledWith(
      new Date("2026-08-18T04:30:00Z"),
    );
  });
});
