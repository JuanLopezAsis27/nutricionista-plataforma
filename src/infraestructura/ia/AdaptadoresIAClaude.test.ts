import { describe, it, expect, vi } from "vitest";
import { AsistenteNutricionalClaude } from "./AsistenteNutricionalClaude";
import { AnalisisComidaIAClaude } from "./AnalisisComidaIAClaude";
import { AsistenteNutricionalStub } from "./AsistenteNutricionalStub";
import { AnalisisComidaIAStub } from "./AnalisisComidaIAStub";
import type { IResolvedorConfigIA } from "./ResolvedorConfigIA";
import type {
  IProveedorLLM,
  OpcionesConversacion,
  OpcionesLLM,
} from "./IProveedorLLM";
import type { AvanceIA } from "@/dominio/servicios/avanceIA";
import { ErrorIA } from "@/dominio/errores/ErrorIA";
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

  /**
   * Antes esto devolvía el texto de demostración del stub: el paciente leía una
   * respuesta inventada creyendo que era la del asistente, y ni él ni el
   * profesional tenían señal de que la IA no había contestado.
   */
  it("propaga el error si la IA está configurada y falla", async () => {
    const completar = vi.fn(async () => {
      throw new Error("red caída");
    });
    const asistente = new AsistenteNutricionalClaude(
      resolverConLLM(completar),
      new AsistenteNutricionalStub(),
    );

    const fallo = await asistente
      .responder("¿Qué ceno?", CONTEXTO)
      .catch((e: unknown) => e);

    expect(fallo).toBeInstanceOf(ErrorIA);
    expect((fallo as ErrorIA).message).toContain("red caída");
  });

  it("emite el avance del modelo cuando se pide en vivo", async () => {
    const conversar = vi.fn(async (opts: OpcionesConversacion) => {
      opts.alAvanzar?.({ tipo: "texto", texto: "Comé " });
      opts.alAvanzar?.({ tipo: "texto", texto: "verduras." });
      return "Comé verduras.";
    });
    const asistente = new AsistenteNutricionalClaude(
      resolverConLLM(conversar),
      new AsistenteNutricionalStub(),
    );
    const avances: AvanceIA[] = [];

    const respuesta = await asistente.responder(
      "¿Qué ceno?",
      CONTEXTO,
      [],
      [],
      (avance) => avances.push(avance),
    );

    expect(avances).toEqual([
      { tipo: "texto", texto: "Comé " },
      { tipo: "texto", texto: "verduras." },
    ]);
    expect(respuesta).toBe("Comé verduras.");
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

  /**
   * Este es el caso que hacía ver los macros de ejemplo como si fueran el
   * análisis real de la foto: un modelo mal escrito en las credenciales o una
   * clave vencida salían por acá disfrazados de resultado.
   */
  it("propaga el error si la IA está configurada y falla", async () => {
    const completar = vi.fn(async () => {
      throw new Error("visión caída");
    });
    const adaptador = new AnalisisComidaIAClaude(
      resolverConLLM(completar),
      almacenamientoMock,
      new AnalisisComidaIAStub(),
    );

    const fallo = await adaptador
      .analizar({ descripcion: "ensalada" })
      .catch((e: unknown) => e);

    expect(fallo).toBeInstanceOf(ErrorIA);
    expect((fallo as ErrorIA).message).toContain("visión caída");
  });

  it("le manda la foto al modelo como bloque de imagen", async () => {
    // La foto se baja del bucket por la URL firmada, así que el fetch es parte
    // del camino que se está probando.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "image/jpeg" },
      }),
    );
    const completar = vi.fn(async (_opts: OpcionesLLM) => jsonComida);
    const adaptador = new AnalisisComidaIAClaude(
      resolverConLLM(completar),
      almacenamientoMock,
      new AnalisisComidaIAStub(),
    );

    await adaptador.analizar({ archivoClave: "diario/arc-1.jpg" });

    const opciones = completar.mock.calls[0]![0];
    expect(opciones.usuario[0]).toMatchObject({
      tipo: "imagen",
      mimeType: "image/jpeg",
    });
    vi.restoreAllMocks();
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
