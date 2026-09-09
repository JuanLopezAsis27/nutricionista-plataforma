import { describe, it, expect, vi } from "vitest";
import { CrearObjetivo } from "./CrearObjetivo";
import { Objetivo } from "@/dominio/entidades/Objetivo";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockObjetivoRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
} from "../_ayudas-test";

describe("CrearObjetivo", () => {
  it("crea el objetivo EN_CURSO y registra el evento CREACION", async () => {
    const objetivos = mockObjetivoRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new CrearObjetivo(objetivos, pacientes);

    const objetivo = await casoUso.ejecutar({
      pacienteId: "pac-1",
      titulo: "Bajar 5 kg",
      prioridad: "ALTA",
    });

    expect(objetivo).toBeInstanceOf(Objetivo);
    expect(objetivo.estado).toBe("EN_CURSO");
    expect(objetivos.crear).toHaveBeenCalledWith(
      expect.any(Objetivo),
      expect.objectContaining({ tipo: "CREACION" }),
    );
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const casoUso = new CrearObjetivo(
      mockObjetivoRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(
      casoUso.ejecutar({ pacienteId: "nadie", titulo: "X" }),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });

  it("puede quedar vinculado a una meta de composición", async () => {
    const objetivos = mockObjetivoRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new CrearObjetivo(objetivos, pacientes);

    const objetivo = await casoUso.ejecutar({
      pacienteId: "pac-1",
      titulo: "Ordenar las cenas",
      objetivoComposicionId: "meta-1",
    });

    expect(objetivo.objetivoComposicionId).toBe("meta-1");
  });

  it("sin vínculo el objetivo sigue siendo válido: hay planes sin número", async () => {
    const objetivos = mockObjetivoRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new CrearObjetivo(objetivos, pacientes);

    const objetivo = await casoUso.ejecutar({
      pacienteId: "pac-1",
      titulo: "Mejorar la relación con la comida",
    });

    expect(objetivo.objetivoComposicionId).toBeNull();
  });

  it("lanza ErrorValidacion si el título está vacío", async () => {
    const objetivos = mockObjetivoRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new CrearObjetivo(objetivos, pacientes);

    await expect(
      casoUso.ejecutar({ pacienteId: "pac-1", titulo: "  " }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(objetivos.crear).not.toHaveBeenCalled();
  });
});
