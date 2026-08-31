import { describe, it, expect, vi } from "vitest";
import { GuardarObjetivoComposicion } from "./GuardarObjetivoComposicion";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockObjetivoComposicionRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  objetivoComposicionEjemplo,
} from "../_ayudas-test";

describe("GuardarObjetivoComposicion", () => {
  it("rechaza si el paciente no existe", async () => {
    const casoUso = new GuardarObjetivoComposicion(
      mockObjetivoComposicionRepositorio(),
      mockPacienteRepositorio(),
    );

    await expect(
      casoUso.ejecutar({
        pacienteId: "no-existe",
        variable: "PESO",
        valorObjetivo: 70,
      }),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });

  it("crea la meta cuando la variable todavía no tiene una", async () => {
    const objetivos = mockObjetivoComposicionRepositorio();
    const casoUso = new GuardarObjetivoComposicion(
      objetivos,
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );

    const objetivo = await casoUso.ejecutar({
      pacienteId: "pac-1",
      variable: "PESO",
      valorObjetivo: 70,
      fechaObjetivo: new Date("2026-12-01"),
    });

    expect(objetivo.variable).toBe("PESO");
    expect(objetivo.valorObjetivo).toBe(70);
    expect(objetivo.estado).toBe("EN_CURSO");
    expect(objetivos.guardar).toHaveBeenCalledOnce();
  });

  it("actualiza la meta existente en vez de crear una segunda", async () => {
    const existente = objetivoComposicionEjemplo({
      variable: "MASA_ADIPOSA_KG",
      valorObjetivo: 15,
    });
    const casoUso = new GuardarObjetivoComposicion(
      mockObjetivoComposicionRepositorio({
        obtenerPorVariable: vi.fn(async () => existente),
      }),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );

    const objetivo = await casoUso.ejecutar({
      pacienteId: "pac-1",
      variable: "MASA_ADIPOSA_KG",
      valorObjetivo: 12,
    });

    // Mismo id: es la misma meta replanteada, no una nueva.
    expect(objetivo.id).toBe(existente.id);
    expect(objetivo.valorObjetivo).toBe(12);
  });

  it("la ecuación es parte de la clave: dos ecuaciones son dos metas", async () => {
    // La meta de % graso por Yuhasz existe; la de Durnin & Womersley no. Si la
    // búsqueda ignorara la ecuación, plantear la segunda pisaría la primera.
    const porYuhasz = objetivoComposicionEjemplo({
      variable: "PORCENTAJE_GRASA",
      metodoGrasa: "YUHASZ_CARTER",
      valorObjetivo: 18,
    });
    const objetivos = mockObjetivoComposicionRepositorio({
      obtenerPorVariable: vi.fn(async (_pacienteId, _variable, metodoGrasa) =>
        metodoGrasa === "YUHASZ_CARTER" ? porYuhasz : null,
      ),
    });
    const casoUso = new GuardarObjetivoComposicion(
      objetivos,
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );

    const otra = await casoUso.ejecutar({
      pacienteId: "pac-1",
      variable: "PORCENTAJE_GRASA",
      metodoGrasa: "DURNIN_WOMERSLEY",
      valorObjetivo: 20,
    });
    expect(otra.id).not.toBe(porYuhasz.id);
    expect(otra.metodoGrasa).toBe("DURNIN_WOMERSLEY");

    const misma = await casoUso.ejecutar({
      pacienteId: "pac-1",
      variable: "PORCENTAJE_GRASA",
      metodoGrasa: "YUHASZ_CARTER",
      valorObjetivo: 16,
    });
    expect(misma.id).toBe(porYuhasz.id);
    expect(misma.valorObjetivo).toBe(16);
  });

  it("acepta las cinco masas del fraccionamiento, no solo adiposa y muscular", async () => {
    const casoUso = new GuardarObjetivoComposicion(
      mockObjetivoComposicionRepositorio(),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );

    for (const [variable, valor] of [
      ["MASA_OSEA_KG", 10],
      ["MASA_RESIDUAL_KG", 12],
      ["MASA_PIEL_KG", 4],
    ] as const) {
      const objetivo = await casoUso.ejecutar({
        pacienteId: "pac-1",
        variable,
        valorObjetivo: valor,
      });
      expect(objetivo.variable).toBe(variable);
      // Ninguna de ellas depende de una ecuación de pliegues.
      expect(objetivo.metodoGrasa).toBeNull();
    }
  });

  it("rechaza un valor fuera del rango de la variable", async () => {
    const casoUso = new GuardarObjetivoComposicion(
      mockObjetivoComposicionRepositorio(),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );

    await expect(
      casoUso.ejecutar({
        pacienteId: "pac-1",
        variable: "INDICE_CINTURA_CADERA",
        valorObjetivo: 12,
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});
