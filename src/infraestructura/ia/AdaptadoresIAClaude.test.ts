import { describe, it, expect, vi } from "vitest";
import { AsistenteNutricionalClaude } from "./AsistenteNutricionalClaude";
import { AnalisisComidaIAClaude } from "./AnalisisComidaIAClaude";
import { AsistenteNutricionalStub } from "./AsistenteNutricionalStub";
import { AnalisisComidaIAStub } from "./AnalisisComidaIAStub";
import type { IResolvedorConfigIA } from "./ResolvedorConfigIA";
import type { IProveedorLLM, OpcionesConversacion } from "./IProveedorLLM";
import type {
  ContextoAsistente,
  HerramientaAsistente,
} from "@/dominio/servicios/IAsistenteNutricional";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";

/**
 * Resolver que entrega un proveedor LLM simulado. La misma función simula tanto
 * `completar` (visión/JSON) como `conversar` (asistente con herramientas).
 */
function resolverConLLM(fn: unknown): IResolvedorConfigIA {
  return {
    obtenerLLM: async () =>
      ({ completar: fn, conversar: fn }) as unknown as IProveedorLLM,
  };
}

/** Resolver sin IA configurada. */
const resolverNulo: IResolvedorConfigIA = { obtenerLLM: async () => null };

const CONTEXTO: ContextoAsistente = {
  nombrePaciente: "Ana",
  objetivos: ["Bajar de peso"],
  tienePlan: true,
  restricciones: ["ALERGIA: maní (severidad ALTA)"],
  recomendacionesNutricionista: ["Dormir 7 a 9 horas"],
};

const almacenamientoMock: IAlmacenamientoArchivos = {
  subir: vi.fn(async () => {}),
  generarUrlLectura: vi.fn(async () => "http://bucket/foto"),
  descargar: vi.fn(async () => new Uint8Array()),
  eliminar: vi.fn(async () => {}),
  listarClaves: vi.fn(async () => []),
};

describe("AsistenteNutricionalClaude", () => {
  it("devuelve la respuesta del modelo cuando hay clave", async () => {
    const completar = vi.fn(async () => "Comé más verduras, Ana.");
    const asistente = new AsistenteNutricionalClaude(
      resolverConLLM(completar),
      new AsistenteNutricionalStub(),
    );

    const respuesta = await asistente.responder("¿Qué ceno?", CONTEXTO);

    expect(respuesta).toBe("Comé más verduras, Ana.");
    expect(completar).toHaveBeenCalledOnce();
  });

  it("usa el stub cuando no hay clave configurada", async () => {
    const asistente = new AsistenteNutricionalClaude(
      resolverNulo,
      new AsistenteNutricionalStub(),
    );
    const respuesta = await asistente.responder("¿Qué ceno?", CONTEXTO);
    expect(respuesta.toLowerCase()).toContain("demostración");
  });

  it("cae al stub si la IA falla (o rechaza)", async () => {
    const completar = vi.fn(async () => {
      throw new Error("red caída");
    });
    const asistente = new AsistenteNutricionalClaude(
      resolverConLLM(completar),
      new AsistenteNutricionalStub(),
    );

    const respuesta = await asistente.responder("¿Qué ceno?", CONTEXTO);
    expect(respuesta).toContain("Ana");
    expect(respuesta.toLowerCase()).toContain("demostración");
  });

  it("ejecuta la herramienta que pide el modelo y usa su resultado", async () => {
    const ejecutarPlan = vi.fn(async () => "Plan: 1800 kcal");
    const herramienta: HerramientaAsistente = {
      nombre: "obtener_plan_nutricional",
      descripcion: "El plan del paciente",
      esquema: { type: "object", properties: {} },
      ejecutar: ejecutarPlan,
    };
    // conversar simulado: el "modelo" pide la herramienta y usa su salida.
    const conversar = vi.fn(async (opts: OpcionesConversacion) => {
      const datos = await opts.ejecutar("obtener_plan_nutricional", {});
      return `Según tu plan tenés ${datos}.`;
    });
    const resolver: IResolvedorConfigIA = {
      obtenerLLM: async () => ({
        modelo: "claude-opus-5",
        completar: vi.fn(),
        conversar,
      }),
    };
    const asistente = new AsistenteNutricionalClaude(
      resolver,
      new AsistenteNutricionalStub(),
    );

    const respuesta = await asistente.responder("¿mi plan?", CONTEXTO, [
      herramienta,
    ]);

    expect(ejecutarPlan).toHaveBeenCalledOnce();
    expect(respuesta).toContain("1800 kcal");
  });
});

describe("AnalisisComidaIAClaude", () => {
  const jsonComida = JSON.stringify({
    descripcion: "Milanesa con puré",
    porcionEstimada: "1 plato",
    calorias: 700,
    proteinasG: 40,
    carbohidratosG: 60,
    grasasG: 30,
    confianza: 0.8,
  });

  it("usa los macros que estima el modelo (JSON)", async () => {
    const completar = vi.fn(async () => jsonComida);
    const adaptador = new AnalisisComidaIAClaude(
      resolverConLLM(completar),
      almacenamientoMock,
      new AnalisisComidaIAStub(),
    );

    const r = await adaptador.analizar({ descripcion: "milanesa con puré" });

    expect(r.calorias).toBe(700);
    expect(r.confianza).toBe(0.8);
    expect(r.nota.toLowerCase()).toContain("ia");
  });

  it("usa el stub cuando no hay clave configurada", async () => {
    const adaptador = new AnalisisComidaIAClaude(
      resolverNulo,
      almacenamientoMock,
      new AnalisisComidaIAStub(),
    );
    const r = await adaptador.analizar({ descripcion: "ensalada" });
    expect(r.confianza).toBe(0.4);
    expect(r.nota.toLowerCase()).toContain("demostración");
  });

  it("cae al stub si la IA falla", async () => {
    const completar = vi.fn(async () => {
      throw new Error("visión caída");
    });
    const adaptador = new AnalisisComidaIAClaude(
      resolverConLLM(completar),
      almacenamientoMock,
      new AnalisisComidaIAStub(),
    );

    const r = await adaptador.analizar({ descripcion: "ensalada" });
    expect(r.confianza).toBe(0.4);
    expect(r.nota.toLowerCase()).toContain("demostración");
  });

  it("acota la confianza al rango [0, 1]", async () => {
    const completar = vi.fn(async () =>
      JSON.stringify({
        descripcion: "X",
        porcionEstimada: "1",
        calorias: 100,
        proteinasG: 1,
        carbohidratosG: 1,
        grasasG: 1,
        confianza: 5,
      }),
    );
    const adaptador = new AnalisisComidaIAClaude(
      resolverConLLM(completar),
      almacenamientoMock,
      new AnalisisComidaIAStub(),
    );

    const r = await adaptador.analizar({ descripcion: "algo" });
    expect(r.confianza).toBe(1);
  });
});
