import { describe, it, expect, vi } from "vitest";
import { EliminarActividadDiario } from "./EliminarActividadDiario";
import { ErrorRegistroDiarioNoEncontrado } from "../../errores/ErrorRegistroDiarioNoEncontrado";
import { ErrorAccesoDenegado } from "../../errores/ErrorAccesoDenegado";
import { mockRegistroDiarioRepositorio } from "../_ayudas-test";

describe("EliminarActividadDiario", () => {
  it("elimina la actividad propia", async () => {
    const registros = mockRegistroDiarioRepositorio({
      obtenerActividad: vi.fn(async () => ({
        id: "act-1",
        registroId: "reg-1",
        pacienteId: "pac-1",
      })),
    });
    const casoUso = new EliminarActividadDiario(registros);

    await casoUso.ejecutar("pac-1", "act-1");

    expect(registros.eliminarActividad).toHaveBeenCalledWith("act-1");
  });

  it("rechaza si la actividad es de otro paciente", async () => {
    const registros = mockRegistroDiarioRepositorio({
      obtenerActividad: vi.fn(async () => ({
        id: "act-1",
        registroId: "reg-1",
        pacienteId: "pac-OTRO",
      })),
    });
    const casoUso = new EliminarActividadDiario(registros);
    await expect(casoUso.ejecutar("pac-1", "act-1")).rejects.toBeInstanceOf(
      ErrorAccesoDenegado,
    );
  });

  it("rechaza si la actividad no existe", async () => {
    const casoUso = new EliminarActividadDiario(
      mockRegistroDiarioRepositorio(),
    );
    await expect(casoUso.ejecutar("pac-1", "no-existe")).rejects.toBeInstanceOf(
      ErrorRegistroDiarioNoEncontrado,
    );
  });
});
