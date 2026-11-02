import { describe, it, expect, vi } from "vitest";
import { GuardarPerfilDeportivo } from "./GuardarPerfilDeportivo";
import { PerfilDeportivo } from "@/dominio/entidades/PerfilDeportivo";
import { Deporte } from "@/dominio/entidades/Deporte";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockDeporteRepositorio,
  mockPerfilDeportivoRepositorio,
  mockPacienteRepositorio,
  perfilDeportivoEjemplo,
  pacienteEjemplo,
} from "../_ayudas-test";

const BOXEO = Deporte.crear(
  { nombre: "Boxeo", formatoPlanificacion: null },
  "dpt-boxeo",
);
const TRAIL = Deporte.crear(
  { nombre: "Trail running", formatoPlanificacion: "CARRERA_TRAIL" },
  "dpt-trail",
);
const FUTBOL = Deporte.crear({ nombre: "Fútbol" }, "dpt-futbol");

function armar(
  perfiles = mockPerfilDeportivoRepositorio(),
  paciente: ReturnType<typeof pacienteEjemplo> | null = pacienteEjemplo(),
) {
  const pacientes = mockPacienteRepositorio({
    obtenerPorId: vi.fn(async () => paciente),
  });
  return new GuardarPerfilDeportivo(
    perfiles,
    pacientes,
    mockDeporteRepositorio([BOXEO, FUTBOL, TRAIL]),
  );
}

describe("GuardarPerfilDeportivo", () => {
  it("crea el perfil con el deporte elegido de la lista", async () => {
    const guardar = vi.fn(async (p: PerfilDeportivo) => p);
    const uc = armar(
      mockPerfilDeportivoRepositorio({
        obtenerPorPaciente: vi.fn(async () => null),
        guardar,
      }),
    );

    const perfil = await uc.ejecutar({
      pacienteId: "pac-1",
      deporteId: "dpt-boxeo",
      nivel: "AMATEUR",
    });

    expect(perfil).toBeInstanceOf(PerfilDeportivo);
    expect(guardar).toHaveBeenCalledOnce();
    expect(perfil.aPrimitivos().deporte).toEqual({
      id: "dpt-boxeo",
      nombre: "Boxeo",
      formatoPlanificacion: null,
    });
  });

  it("el perfil lleva la planificación que le corresponde a su deporte", async () => {
    const perfil = await armar().ejecutar({
      pacienteId: "pac-1",
      deporteId: "dpt-trail",
    });
    expect(perfil.deporte.formatoPlanificacion).toBe("CARRERA_TRAIL");
  });

  it("actualiza el perfil existente conservando su id y creadoEn", async () => {
    const existente = perfilDeportivoEjemplo({}, "dep-9");
    const guardar = vi.fn(async (p: PerfilDeportivo) => p);
    const uc = armar(
      mockPerfilDeportivoRepositorio({
        obtenerPorPaciente: vi.fn(async () => existente),
        guardar,
      }),
    );

    await uc.ejecutar({
      pacienteId: "pac-1",
      deporteId: "dpt-futbol",
      nivel: "ELITE",
    });

    const guardado = guardar.mock.calls[0]![0].aPrimitivos();
    expect(guardado.id).toBe("dep-9"); // conserva el id existente
    expect(guardado.deporte.nombre).toBe("Fútbol");
    expect(guardado.creadoEn).toEqual(existente.aPrimitivos().creadoEn);
  });

  it("rechaza un deporte que no está en la lista, antes de escribir", async () => {
    const perfiles = mockPerfilDeportivoRepositorio();
    const uc = armar(perfiles);

    await expect(
      uc.ejecutar({ pacienteId: "pac-1", deporteId: "inventado" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(perfiles.guardar).not.toHaveBeenCalled();
  });

  it("falla si el paciente no es del inquilino (guard)", async () => {
    const perfiles = mockPerfilDeportivoRepositorio();
    const uc = armar(perfiles, null);

    await expect(
      uc.ejecutar({ pacienteId: "ajeno", deporteId: "dpt-boxeo" }),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
    expect(perfiles.guardar).not.toHaveBeenCalled();
  });
});
