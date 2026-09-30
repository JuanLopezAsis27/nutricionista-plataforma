import { describe, it, expect } from "vitest";
import { destinoSeguro, DESTINO_POR_DEFECTO } from "./destinoSeguro";

const BASE = "https://app.nutri.com";

describe("destinoSeguro", () => {
  it("acepta una ruta interna con su query y su hash", () => {
    expect(destinoSeguro("/dashboard/pacientes?pagina=2#lista", BASE)).toBe(
      "/dashboard/pacientes?pagina=2#lista",
    );
    expect(destinoSeguro("/mis-planes", BASE)).toBe("/mis-planes");
  });

  it("sin destino o vacío va al dashboard", () => {
    expect(destinoSeguro(null, BASE)).toBe(DESTINO_POR_DEFECTO);
    expect(destinoSeguro(undefined, BASE)).toBe(DESTINO_POR_DEFECTO);
    expect(destinoSeguro("", BASE)).toBe(DESTINO_POR_DEFECTO);
  });

  it.each([
    ["URL absoluta", "https://otro-sitio.com"],
    ["protocolo relativo", "//otro-sitio.com"],
    ["esquema javascript", "javascript:alert(1)"],
    ["ruta sin barra inicial", "otro-sitio.com"],
    // El parser trata `\` como `/`: «/\otro» es «//otro», un host.
    ["barra invertida", "/\\otro-sitio.com"],
    ["dos barras invertidas", "/\\\\otro-sitio.com"],
    // El parser descarta tabs y saltos de línea antes de resolver.
    ["tab entre las barras", "/\t/otro-sitio.com"],
    ["salto de línea entre las barras", "/\n/otro-sitio.com"],
  ])("rechaza %s (redirector abierto)", (_caso, pedido) => {
    expect(destinoSeguro(pedido, BASE)).toBe(DESTINO_POR_DEFECTO);
  });

  it("nunca devuelve una URL absoluta, aunque apunte a la propia app", () => {
    expect(destinoSeguro("/dashboard", BASE)).not.toMatch(/^https?:/);
  });
});
