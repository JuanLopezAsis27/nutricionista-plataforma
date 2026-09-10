import { describe, it, expect, vi } from "vitest";
import { AnalizarFotoDeComida } from "./AnalizarFotoDeComida";
import { ErrorArchivoNoEncontrado } from "@/dominio/errores/ErrorArchivoNoEncontrado";
import { Archivo } from "@/dominio/entidades/Archivo";
import {
  mockAnalisisComidaIA,
  mockHistorialIARepositorio,
  mockArchivoRepositorio,
} from "../_ayudas-test";

function fotoDeComida(): Archivo {
  return Archivo.crear(
    {
      nombreOriginal: "almuerzo.jpg",
      mimeType: "image/jpeg",
      tamanoBytes: 1024,
      contexto: "foto-comida",
    },
    "arc-1",
  );
}

describe("AnalizarFotoDeComida", () => {
  it("le pasa al analizador la CLAVE de la foto en el bucket", async () => {
    const analizar = vi.fn(async () => ({
      descripcion: "plato demo",
      porcionEstimada: "1 plato",
      calorias: 500,
      proteinasG: 30,
      carbohidratosG: 40,
      grasasG: 20,
      confianza: 0.4,
      nota: "demo",
    }));
    const foto = fotoDeComida();
    const uc = new AnalizarFotoDeComida(
      mockAnalisisComidaIA({ analizar }),
      mockHistorialIARepositorio(),
      mockArchivoRepositorio({ obtenerPorId: vi.fn(async () => foto) }),
    );

    await uc.ejecutar({
      pacienteId: "pac-1",
      archivoId: "arc-1",
      descripcion: "milanesa",
    });

    expect(analizar).toHaveBeenCalledWith({
      archivoClave: foto.clave,
      descripcion: "milanesa",
    });
  });

  it("delega en el analizador y persiste el resultado", async () => {
    const guardarAnalisis = vi.fn(async () => {});
    const uc = new AnalizarFotoDeComida(
      mockAnalisisComidaIA(),
      mockHistorialIARepositorio({ guardarAnalisis }),
      mockArchivoRepositorio({
        obtenerPorId: vi.fn(async () => fotoDeComida()),
      }),
    );

    const resultado = await uc.ejecutar({
      pacienteId: "pac-1",
      archivoId: "arc-1",
    });

    expect(resultado.calorias).toBe(500);
    expect(resultado.nota).toBe("demo");
    expect(guardarAnalisis).toHaveBeenCalledOnce();
  });

  it("analiza solo con la descripción cuando no hay foto", async () => {
    const analizar = vi.fn(async () => ({
      descripcion: "ensalada",
      porcionEstimada: "1 bowl",
      calorias: 200,
      proteinasG: 5,
      carbohidratosG: 20,
      grasasG: 8,
      confianza: 0.3,
      nota: "demo",
    }));
    const obtenerPorId = vi.fn(async () => null);
    const uc = new AnalizarFotoDeComida(
      mockAnalisisComidaIA({ analizar }),
      mockHistorialIARepositorio(),
      mockArchivoRepositorio({ obtenerPorId }),
    );

    await uc.ejecutar({ pacienteId: "pac-1", descripcion: "ensalada" });

    expect(obtenerPorId).not.toHaveBeenCalled();
    expect(analizar).toHaveBeenCalledWith({
      archivoClave: undefined,
      descripcion: "ensalada",
    });
  });

  it("falla si el archivo no existe (en vez de analizar sin la foto)", async () => {
    const uc = new AnalizarFotoDeComida(
      mockAnalisisComidaIA(),
      mockHistorialIARepositorio(),
      mockArchivoRepositorio({ obtenerPorId: vi.fn(async () => null) }),
    );

    await expect(
      uc.ejecutar({ pacienteId: "pac-1", archivoId: "arc-fantasma" }),
    ).rejects.toBeInstanceOf(ErrorArchivoNoEncontrado);
  });
});
