import { describe, it, expect, vi } from "vitest";
import { EliminarComidaDiario } from "./EliminarComidaDiario";
import { ErrorRegistroDiarioNoEncontrado } from "@/dominio/errores/ErrorRegistroDiarioNoEncontrado";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";
import {
  mockRegistroDiarioRepositorio,
  mockArchivoRepositorio,
  mockAlmacenamientoArchivos,
  archivoEjemplo,
} from "../_ayudas-test";

describe("EliminarComidaDiario", () => {
  it("elimina la comida y borra su foto del bucket", async () => {
    const foto = archivoEjemplo({
      contexto: "foto-comida",
      nombreOriginal: "plato.jpg",
      mimeType: "image/jpeg",
    });
    const registros = mockRegistroDiarioRepositorio({
      obtenerComida: vi.fn(async () => ({
        id: "com-1",
        registroId: "reg-1",
        pacienteId: "pac-1",
      })),
    });
    const archivos = mockArchivoRepositorio({
      listarPorDueno: vi.fn(async () => [foto]),
    });
    const almacenamiento = mockAlmacenamientoArchivos();
    const casoUso = new EliminarComidaDiario(
      registros,
      archivos,
      almacenamiento,
    );

    await casoUso.ejecutar("pac-1", "com-1");

    expect(registros.eliminarComida).toHaveBeenCalledWith("com-1");
    expect(almacenamiento.eliminar).toHaveBeenCalledWith(foto.clave);
  });

  it("rechaza si la comida es de otro paciente", async () => {
    const registros = mockRegistroDiarioRepositorio({
      obtenerComida: vi.fn(async () => ({
        id: "com-1",
        registroId: "reg-1",
        pacienteId: "pac-OTRO",
      })),
    });
    const casoUso = new EliminarComidaDiario(
      registros,
      mockArchivoRepositorio(),
      mockAlmacenamientoArchivos(),
    );

    await expect(casoUso.ejecutar("pac-1", "com-1")).rejects.toBeInstanceOf(
      ErrorAccesoDenegado,
    );
    expect(registros.eliminarComida).not.toHaveBeenCalled();
  });

  it("rechaza si la comida no existe", async () => {
    const casoUso = new EliminarComidaDiario(
      mockRegistroDiarioRepositorio(),
      mockArchivoRepositorio(),
      mockAlmacenamientoArchivos(),
    );
    await expect(casoUso.ejecutar("pac-1", "no-existe")).rejects.toBeInstanceOf(
      ErrorRegistroDiarioNoEncontrado,
    );
  });
});
