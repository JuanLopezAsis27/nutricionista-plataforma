import { describe, it, expect, vi } from "vitest";
import { GuardarConexionGoogle } from "./GuardarConexionGoogle";
import { mockCuentaConectadaRepositorio } from "../_ayudas-test";

describe("GuardarConexionGoogle", () => {
  it("crea la cuenta de Google a partir de los tokens del callback y la guarda", async () => {
    const guardar = vi.fn(async (c) => c);
    const cuenta = await new GuardarConexionGoogle(
      mockCuentaConectadaRepositorio({ guardar }),
    ).ejecutar({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiraEn: new Date("2026-08-01T00:00:00Z"),
      emailCuenta: "pro@gmail.com",
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
    });

    expect(cuenta.proveedor).toBe("GOOGLE");
    expect(cuenta.emailCuenta).toBe("pro@gmail.com");
    expect(cuenta.refreshToken).toBe("refresh-1");
    expect(guardar).toHaveBeenCalledOnce();
  });
});
