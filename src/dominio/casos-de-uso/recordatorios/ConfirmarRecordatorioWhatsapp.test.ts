import { describe, it, expect, vi } from "vitest";
import { ConfirmarRecordatorioWhatsapp } from "./ConfirmarRecordatorioWhatsapp";
import { ErrorRecordatorioNoEncontrado } from "../../errores/ErrorRecordatorioNoEncontrado";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import {
  mockRecordatorioWhatsappRepositorio,
  recordatorioWhatsappEjemplo,
} from "../_ayudas-test";

describe("ConfirmarRecordatorioWhatsapp", () => {
  // Ojo con el vocabulario: acá "confirmar" es que el MENSAJE salió (estado
  // ENVIADO). CONFIRMADO, en cambio, es que el PACIENTE dijo que viene.
  it("marca como ENVIADO cuando el profesional dice que lo mandó", async () => {
    const repo = mockRecordatorioWhatsappRepositorio({
      obtenerPorId: vi.fn(async () => recordatorioWhatsappEjemplo()),
    });
    const caso = new ConfirmarRecordatorioWhatsapp(repo);

    const resultado = await caso.ejecutar("rec-1", true);

    expect(resultado.estado).toBe("ENVIADO");
    expect(resultado.aPrimitivos().confirmadoEn).not.toBeNull();
    expect(repo.actualizar).toHaveBeenCalledTimes(1);
  });

  it("marca como DESCARTADO cuando dice que no lo envió", async () => {
    const repo = mockRecordatorioWhatsappRepositorio({
      obtenerPorId: vi.fn(async () => recordatorioWhatsappEjemplo()),
    });

    const resultado = await new ConfirmarRecordatorioWhatsapp(repo).ejecutar(
      "rec-1",
      false,
    );

    expect(resultado.estado).toBe("DESCARTADO");
  });

  it("no re-resuelve un recordatorio ya resuelto", async () => {
    const repo = mockRecordatorioWhatsappRepositorio({
      obtenerPorId: vi.fn(async () =>
        recordatorioWhatsappEjemplo().confirmarEnvio(),
      ),
    });

    await expect(
      new ConfirmarRecordatorioWhatsapp(repo).ejecutar("rec-1", true),
    ).rejects.toThrow(ErrorValidacion);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it("falla si el recordatorio no existe", async () => {
    const repo = mockRecordatorioWhatsappRepositorio();

    await expect(
      new ConfirmarRecordatorioWhatsapp(repo).ejecutar("rec-x", true),
    ).rejects.toThrow(ErrorRecordatorioNoEncontrado);
  });
});
