import { describe, it, expect, vi } from "vitest";
import { GuardarPerfilDeportivo } from "./GuardarPerfilDeportivo";
import { PerfilDeportivo } from "../../entidades/PerfilDeportivo";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import {
  mockPerfilDeportivoRepositorio,
  mockPacienteRepositorio,
  perfilDeportivoEjemplo,
  pacienteEjemplo,
} from "../_ayudas-test";

describe("GuardarPerfilDeportivo", () => {
  it("crea el perfil si el paciente no tenía uno", async () => {
    const guardar = vi.fn(async (p: PerfilDeportivo) => p);
    const perfiles = mockPerfilDeportivoRepositorio({
      obtenerPorPaciente: vi.fn(async () => null),
      guardar,
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const uc = new GuardarPerfilDeportivo(perfiles, pacientes);

    const perfil = await uc.ejecutar({
      pacienteId: "pac-1",
      deporte: "Boxeo",
      nivel: "AMATEUR",
    });

    expect(perfil).toBeInstanceOf(PerfilDeportivo);
    expect(guardar).toHaveBeenCalledOnce();
    expect(perfil.aPrimitivos().deporte).toBe("Boxeo");
  });

  it("actualiza el perfil existente conservando su id y creadoEn", async () => {
    const existente = perfilDeportivoEjemplo({ deporte: "Atletismo" }, "dep-9");
    const guardar = vi.fn(async (p: PerfilDeportivo) => p);
    const perfiles = mockPerfilDeportivoRepositorio({
      obtenerPorPaciente: vi.fn(async () => existente),
      guardar,
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const uc = new GuardarPerfilDeportivo(perfiles, pacientes);

    await uc.ejecutar({
      pacienteId: "pac-1",
      deporte: "Fútbol",
      nivel: "ELITE",
    });

    const guardado = guardar.mock.calls[0]![0].aPrimitivos();
    expect(guardado.id).toBe("dep-9"); // conserva el id existente
    expect(guardado.deporte).toBe("Fútbol");
    expect(guardado.creadoEn).toEqual(existente.aPrimitivos().creadoEn);
  });

  it("falla si el paciente no es del inquilino (guard)", async () => {
    const perfiles = mockPerfilDeportivoRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => null),
    });
    const uc = new GuardarPerfilDeportivo(perfiles, pacientes);

    await expect(
      uc.ejecutar({ pacienteId: "ajeno", deporte: "Tenis" }),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
    expect(perfiles.guardar).not.toHaveBeenCalled();
  });
});
