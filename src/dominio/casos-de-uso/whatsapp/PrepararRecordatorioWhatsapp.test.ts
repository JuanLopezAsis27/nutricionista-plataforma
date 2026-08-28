import { describe, it, expect, vi } from "vitest";
import { PrepararRecordatorioWhatsapp } from "./PrepararRecordatorioWhatsapp";
import { ConfiguracionConsultorio } from "../../entidades/ConfiguracionConsultorio";
import { ErrorTurnoNoEncontrado } from "../../errores/ErrorTurnoNoEncontrado";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import {
  mockTurnoRepositorio,
  mockPacienteRepositorio,
  mockConfiguracionRepositorio,
  mockRecordatorioWhatsappRepositorio,
  mockProveedorWhatsapp,
  turnoEjemplo,
  pacienteEjemplo,
} from "../_ayudas-test";

const TURNO = turnoEjemplo({ fecha: new Date("2026-09-15T00:00:00Z"), hora: "10:30" });
const PACIENTE = pacienteEjemplo({ telefono: "011 15 5555-4444" });

function armar(sobrescribir: {
  turno?: ReturnType<typeof turnoEjemplo> | null;
  paciente?: ReturnType<typeof pacienteEjemplo> | null;
  config?: ConfiguracionConsultorio | null;
} = {}) {
  const recordatorios = mockRecordatorioWhatsappRepositorio();
  const proveedor = mockProveedorWhatsapp();
  const caso = new PrepararRecordatorioWhatsapp(
    mockTurnoRepositorio({
      obtenerPorId: vi.fn(async () =>
        sobrescribir.turno === undefined ? TURNO : sobrescribir.turno,
      ),
    }),
    mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () =>
        sobrescribir.paciente === undefined ? PACIENTE : sobrescribir.paciente,
      ),
    }),
    mockConfiguracionRepositorio({
      obtener: vi.fn(async () => sobrescribir.config ?? null),
    }),
    recordatorios,
    proveedor,
  );
  return { caso, recordatorios, proveedor };
}

describe("PrepararRecordatorioWhatsapp", () => {
  it("normaliza el teléfono y reemplaza los placeholders de la plantilla", async () => {
    const config = ConfiguracionConsultorio.porDefecto().actualizar({
      nombreProfesional: "Lic. Nicolás",
      whatsappPlantilla: "{{paciente}} / {{fecha}} / {{hora}} / {{profesional}}",
    });
    const { caso } = armar({ config });

    const resultado = await caso.ejecutar({ turnoId: "tur-1", usuarioId: "usr-1" });

    expect(resultado.telefono).toBe("5491155554444");
    expect(resultado.mensaje).toBe("Ana García / 15/09/2026 / 10:30 / Lic. Nicolás");
    expect(resultado.enlace).toContain("5491155554444");
  });

  it("registra el recordatorio en estado PREPARADO", async () => {
    const { caso, recordatorios } = armar();

    const resultado = await caso.ejecutar({ turnoId: "tur-1", usuarioId: "usr-9" });

    expect(recordatorios.registrar).toHaveBeenCalledTimes(1);
    const [entidad] = vi.mocked(recordatorios.registrar).mock.calls[0]!;
    const registrado = entidad.aPrimitivos();
    expect(registrado.estado).toBe("PREPARADO");
    expect(registrado.confirmadoEn).toBeNull();
    expect(registrado.turnoId).toBe("tur-1");
    expect(registrado.usuarioId).toBe("usr-9");
    expect(registrado.mensaje).toBe(resultado.mensaje);
  });

  it("usa el texto editado por el profesional cuando viene", async () => {
    const { caso, proveedor } = armar();

    const resultado = await caso.ejecutar({
      turnoId: "tur-1",
      usuarioId: "usr-1",
      mensaje: "  Nos vemos mañana  ",
    });

    expect(resultado.mensaje).toBe("Nos vemos mañana");
    expect(proveedor.preparar).toHaveBeenCalledWith({
      telefono: "5491155554444",
      texto: "Nos vemos mañana",
    });
  });

  it("falla si el paciente no tiene teléfono cargado", async () => {
    const { caso, recordatorios } = armar({ paciente: pacienteEjemplo({ telefono: null }) });

    await expect(caso.ejecutar({ turnoId: "tur-1", usuarioId: "usr-1" })).rejects.toThrow(
      ErrorValidacion,
    );
    expect(recordatorios.registrar).not.toHaveBeenCalled();
  });

  it("falla si el turno no existe", async () => {
    const { caso } = armar({ turno: null });

    await expect(caso.ejecutar({ turnoId: "tur-1", usuarioId: "usr-1" })).rejects.toThrow(
      ErrorTurnoNoEncontrado,
    );
  });
});
