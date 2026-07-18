import { describe, it, expect, vi } from "vitest";
import { ObtenerInformeHabitos } from "./ObtenerInformeHabitos";
import { RegistroDiario } from "../../entidades/RegistroDiario";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import {
  mockRegistroDiarioRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  registroDiarioEjemplo,
} from "../_ayudas-test";

const desde = new Date("2026-07-01");
const hasta = new Date("2026-07-14");

describe("ObtenerInformeHabitos", () => {
  it("resume agua, sueño y actividad del rango", async () => {
    // Día 1: agua 1500, peso, sin actividad. Día 2: sueño 8 BUENA + 30 min de bici.
    const dia1 = registroDiarioEjemplo(); // aguaMl 1500
    const dia2 = RegistroDiario.reconstruir({
      ...registroDiarioEjemplo({ fecha: new Date("2026-07-11"), aguaMl: 2500 }, "reg-2").aPrimitivos(),
      horasSueno: 8,
      calidadSueno: "BUENA",
      actividades: [
        {
          id: "act-1",
          tipo: "Bici",
          duracionMinutos: 30,
          intensidad: "MODERADA",
          notas: null,
          creadoEn: new Date(),
        },
      ],
    });
    const registros = mockRegistroDiarioRepositorio({
      listarPorRango: vi.fn(async () => [dia1, dia2]),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new ObtenerInformeHabitos(registros, pacientes);

    const informe = await casoUso.ejecutar("pac-1", desde, hasta);

    expect(informe.diasEnRango).toBe(14);
    expect(informe.diasConRegistro).toBe(2);
    expect(informe.aguaPromedioMl).toBe(2000);
    expect(informe.horasSuenoPromedio).toBe(8);
    expect(informe.calidadSueno.BUENA).toBe(1);
    expect(informe.diasConActividad).toBe(1);
    expect(informe.minutosActividadTotal).toBe(30);
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const casoUso = new ObtenerInformeHabitos(
      mockRegistroDiarioRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(casoUso.ejecutar("inexistente", desde, hasta)).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
  });
});
