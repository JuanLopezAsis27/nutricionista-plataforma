import { describe, it, expect, vi } from "vitest";
import { AgregarFotoComida } from "./AgregarFotoComida";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";
import { ErrorArchivoNoEncontrado } from "@/dominio/errores/ErrorArchivoNoEncontrado";
import {
  mockRegistroDiarioRepositorio,
  mockArchivoRepositorio,
  mockAlmacenamientoArchivos,
  archivoEjemplo,
} from "../_ayudas-test";

const COMIDA_PROPIA = { id: "com-1", registroId: "reg-1", pacienteId: "pac-1" };

describe("AgregarFotoComida", () => {
  it("vincula la foto a la comida", async () => {
    const nueva = archivoEjemplo(
      {
        contexto: "foto-comida",
        nombreOriginal: "plato.jpg",
        mimeType: "image/jpeg",
      },
      "arc-nueva",
    );
    const registros = mockRegistroDiarioRepositorio({
      obtenerComida: vi.fn(async () => COMIDA_PROPIA),
    });
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => nueva),
    });
    const casoUso = new AgregarFotoComida(
      registros,
      archivos,
      mockAlmacenamientoArchivos(),
    );

    await casoUso.ejecutar("pac-1", "com-1", "arc-nueva");

    expect(archivos.vincularDueno).toHaveBeenCalledWith("arc-nueva", {
      comidaConsumidaId: "com-1",
    });
  });

  it("reemplaza la foto anterior si existía", async () => {
    const anterior = archivoEjemplo(
      {
        contexto: "foto-comida",
        nombreOriginal: "vieja.jpg",
        mimeType: "image/jpeg",
      },
      "arc-vieja",
    );
    const nueva = archivoEjemplo(
      {
        contexto: "foto-comida",
        nombreOriginal: "nueva.jpg",
        mimeType: "image/jpeg",
      },
      "arc-nueva",
    );
    const registros = mockRegistroDiarioRepositorio({
      obtenerComida: vi.fn(async () => COMIDA_PROPIA),
    });
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => nueva),
      listarPorDueno: vi.fn(async () => [anterior]),
    });
    const almacenamiento = mockAlmacenamientoArchivos();
    const casoUso = new AgregarFotoComida(registros, archivos, almacenamiento);

    await casoUso.ejecutar("pac-1", "com-1", "arc-nueva");

    expect(archivos.eliminar).toHaveBeenCalledWith("arc-vieja");
    expect(almacenamiento.eliminar).toHaveBeenCalledWith(anterior.clave);
    expect(archivos.vincularDueno).toHaveBeenCalledWith("arc-nueva", {
      comidaConsumidaId: "com-1",
    });
  });

  it("rechaza si la comida es de otro paciente", async () => {
    const registros = mockRegistroDiarioRepositorio({
      obtenerComida: vi.fn(async () => ({
        ...COMIDA_PROPIA,
        pacienteId: "pac-OTRO",
      })),
    });
    const casoUso = new AgregarFotoComida(
      registros,
      mockArchivoRepositorio(),
      mockAlmacenamientoArchivos(),
    );
    await expect(
      casoUso.ejecutar("pac-1", "com-1", "arc-1"),
    ).rejects.toBeInstanceOf(ErrorAccesoDenegado);
  });

  it("rechaza si el archivo no existe", async () => {
    const registros = mockRegistroDiarioRepositorio({
      obtenerComida: vi.fn(async () => COMIDA_PROPIA),
    });
    const casoUso = new AgregarFotoComida(
      registros,
      mockArchivoRepositorio(),
      mockAlmacenamientoArchivos(),
    );
    await expect(
      casoUso.ejecutar("pac-1", "com-1", "no-existe"),
    ).rejects.toBeInstanceOf(ErrorArchivoNoEncontrado);
  });
});
