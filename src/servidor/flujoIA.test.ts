import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { iniciarFlujoIA } from "./flujoIA";
import type { EventoIA } from "@/aplicacion/dtos/ia.dto";
import { ErrorIA } from "@/dominio/errores/ErrorIA";

vi.mock("@/infraestructura/monitoreo/monitor", () => ({
  monitorErrores: { capturar: vi.fn() },
}));

async function juntar<T>(flujo: AsyncIterable<EventoIA<T>>) {
  const eventos: EventoIA<T>[] = [];
  for await (const evento of flujo) eventos.push(evento);
  return eventos;
}

describe("iniciarFlujoIA", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("emite los avances en orden y cierra con el resultado", async () => {
    const flujo = iniciarFlujoIA("ia.test", async (alAvanzar) => {
      alAvanzar({ tipo: "texto", texto: "Hola " });
      await Promise.resolve();
      alAvanzar({ tipo: "texto", texto: "Ana." });
      return { respuesta: "Hola Ana." };
    });

    expect(await juntar(flujo)).toEqual([
      { tipo: "texto", texto: "Hola " },
      { tipo: "texto", texto: "Ana." },
      { tipo: "fin", resultado: { respuesta: "Hola Ana." } },
    ]);
  });

  /**
   * El trabajo arranca en `iniciarFlujoIA` y no en el primer `next()`, porque
   * ahí es donde todavía está el alcance de inquilino de la request.
   */
  it("arranca el trabajo sin esperar a que alguien itere", async () => {
    const trabajo = vi.fn(async () => "listo");

    const flujo = iniciarFlujoIA("ia.test", trabajo);

    expect(trabajo).toHaveBeenCalledOnce();
    await juntar(flujo);
  });

  it("no pierde los avances que llegan antes de que se empiece a leer", async () => {
    const flujo = iniciarFlujoIA("ia.test", async (alAvanzar) => {
      alAvanzar({ tipo: "texto", texto: "uno" });
      alAvanzar({ tipo: "texto", texto: "dos" });
      return "fin";
    });
    // Se deja terminar el trabajo ANTES de iterar.
    await new Promise((r) => setTimeout(r, 0));

    expect(await juntar(flujo)).toEqual([
      { tipo: "texto", texto: "uno" },
      { tipo: "texto", texto: "dos" },
      { tipo: "fin", resultado: "fin" },
    ]);
  });

  it("borra lo escrito antes de una herramienta avisando con el evento", async () => {
    const flujo = iniciarFlujoIA("ia.test", async (alAvanzar) => {
      alAvanzar({ tipo: "texto", texto: "Dejame ver…" });
      alAvanzar({ tipo: "herramienta", nombre: "obtener_plan_nutricional" });
      alAvanzar({ tipo: "texto", texto: "Tu plan tiene 1800 kcal." });
      return "ok";
    });

    expect(await juntar(flujo)).toContainEqual({
      tipo: "herramienta",
      nombre: "obtener_plan_nutricional",
    });
  });

  /**
   * Lanzar en vez de emitir haría que tRPC considerase la falla reintentable y
   * el cliente reconectara solo: cada reconexión es otra llamada al modelo,
   * facturada contra la clave del profesional.
   */
  it("cierra con un evento de error, sin lanzar", async () => {
    const flujo = iniciarFlujoIA("ia.test", async () => {
      throw new ErrorIA("El modelo openai-4o-mini no existe.");
    });

    expect(await juntar(flujo)).toEqual([
      { tipo: "error", mensaje: "El modelo openai-4o-mini no existe." },
    ]);
  });

  /** Un error que no es del dominio puede traer detalle interno: sale genérico. */
  it("no filtra el mensaje de un error inesperado", async () => {
    const flujo = iniciarFlujoIA("ia.test", async () => {
      throw new Error("connect ECONNREFUSED 10.0.0.7:5432");
    });

    const eventos = await juntar(flujo);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({ tipo: "error" });
    expect(JSON.stringify(eventos[0])).not.toContain("ECONNREFUSED");
  });
});
