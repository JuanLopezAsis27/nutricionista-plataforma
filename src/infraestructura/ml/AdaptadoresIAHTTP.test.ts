import { describe, it, expect, vi } from "vitest";
import { AnalisisComidaIAHTTP } from "./AnalisisComidaIAHTTP";
import { AnalisisPredictivoHTTP } from "./AnalisisPredictivoHTTP";
import { AnalisisComidaIAStub } from "@/infraestructura/ia/AnalisisComidaIAStub";
import { AnalisisPredictivoStub } from "@/infraestructura/ia/AnalisisPredictivoStub";
import type { ClienteML } from "./clienteML";

function clienteMock(postar: unknown): ClienteML {
  return { postar } as unknown as ClienteML;
}

describe("AnalisisComidaIAHTTP", () => {
  it("usa el resultado del servicio de ML cuando responde", async () => {
    const postar = vi.fn(async () => ({
      descripcion: "milanesa con puré",
      porcionEstimada: "1 plato",
      calorias: 700,
      proteinasG: 40,
      carbohidratosG: 60,
      grasasG: 30,
      confianza: 0.9,
      nota: "modelo real",
    }));
    const adaptador = new AnalisisComidaIAHTTP(clienteMock(postar), new AnalisisComidaIAStub());

    const r = await adaptador.analizar({ descripcion: "milanesa con puré" });

    expect(r.calorias).toBe(700);
    expect(r.confianza).toBe(0.9);
  });

  it("cae al stub si el servicio de ML falla", async () => {
    const postar = vi.fn(async () => {
      throw new Error("ML caído");
    });
    const adaptador = new AnalisisComidaIAHTTP(clienteMock(postar), new AnalisisComidaIAStub());

    const r = await adaptador.analizar({ descripcion: "ensalada" });

    // El stub devuelve confianza 0.4 y una nota de demostración.
    expect(r.confianza).toBe(0.4);
    expect(r.nota.toLowerCase()).toContain("demostración");
  });
});

describe("AnalisisPredictivoHTTP", () => {
  it("cae al stub (3 insights) si el servicio de ML falla", async () => {
    const postar = vi.fn(async () => {
      throw new Error("ML caído");
    });
    const adaptador = new AnalisisPredictivoHTTP(
      clienteMock(postar),
      new AnalisisPredictivoStub(),
    );

    const insights = await adaptador.insights();

    expect(insights).toHaveLength(3);
    expect(insights[0]!.tipo).toBe("RIESGO_ABANDONO");
  });
});
