import { vi } from "vitest";
import type { IPacienteRepositorio } from "../repositorios/IPacienteRepositorio";
import type { ITurnoRepositorio } from "../repositorios/ITurnoRepositorio";
import type { IDietaRepositorio } from "../repositorios/IDietaRepositorio";
import type { IUsuarioRepositorio } from "../repositorios/IUsuarioRepositorio";
import type { IHasheadorContrasena } from "../servicios/IHasheadorContrasena";
import { Paciente, type DatosNuevoPaciente } from "../entidades/Paciente";
import { Turno, type DatosNuevoTurno } from "../entidades/Turno";
import { Dieta, type DatosNuevaDieta } from "../entidades/Dieta";
import { Usuario } from "../entidades/Usuario";

/**
 * Ayudas para los tests de casos de uso.
 *
 * Provee constructores de repositorios mock que implementan las interfaces
 * del dominio (nunca dependen de Prisma) y fábricas de entidades de ejemplo.
 * No es un archivo de test (no contiene `describe`).
 */

export function mockPacienteRepositorio(
  parcial: Partial<IPacienteRepositorio> = {},
): IPacienteRepositorio {
  return {
    crear: vi.fn(async (p: Paciente) => p),
    actualizar: vi.fn(async (p: Paciente) => p),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    obtenerPorEmail: vi.fn(async () => null),
    listar: vi.fn(async () => []),
    contar: vi.fn(async () => 0),
    ...parcial,
  };
}

export function mockTurnoRepositorio(
  parcial: Partial<ITurnoRepositorio> = {},
): ITurnoRepositorio {
  return {
    crear: vi.fn(async (t: Turno) => t),
    actualizar: vi.fn(async (t: Turno) => t),
    obtenerPorId: vi.fn(async () => null),
    obtenerEnFecha: vi.fn(async () => []),
    obtenerPorPaciente: vi.fn(async () => []),
    listar: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockDietaRepositorio(
  parcial: Partial<IDietaRepositorio> = {},
): IDietaRepositorio {
  return {
    crear: vi.fn(async (d: Dieta) => d),
    actualizar: vi.fn(async (d: Dieta) => d),
    eliminar: vi.fn(async () => {}),
    obtenerPorId: vi.fn(async () => null),
    listar: vi.fn(async () => []),
    contarAsignacionesActivasDeDieta: vi.fn(async () => 0),
    asignarAPaciente: vi.fn(async (a) => a),
    desactivarAsignacionesDe: vi.fn(async () => {}),
    obtenerAsignacionActiva: vi.fn(async () => null),
    obtenerDietaActivaDePaciente: vi.fn(async () => null),
    ...parcial,
  };
}

export function mockUsuarioRepositorio(
  parcial: Partial<IUsuarioRepositorio> = {},
): IUsuarioRepositorio {
  return {
    crear: vi.fn(async (u: Usuario) => u),
    actualizar: vi.fn(async (u: Usuario) => u),
    obtenerPorId: vi.fn(async () => null),
    obtenerPorEmail: vi.fn(async () => null),
    obtenerPorPacienteId: vi.fn(async () => null),
    eliminarPorPacienteId: vi.fn(async () => {}),
    ...parcial,
  };
}

export function mockHasheador(): IHasheadorContrasena {
  return {
    hashear: vi.fn(async (plano: string) => `hash:${plano}`),
    verificar: vi.fn(async (plano: string, hash: string) => hash === `hash:${plano}`),
  };
}

// --- Fábricas de entidades de ejemplo ---------------------------------------

export function pacienteEjemplo(cambios: Partial<DatosNuevoPaciente> = {}, id = "pac-1"): Paciente {
  return Paciente.crear(
    {
      nombre: "Ana",
      apellido: "García",
      email: "ana@mail.com",
      telefono: null,
      fechaNacimiento: null,
      notas: null,
      ...cambios,
    },
    id,
  );
}

export function turnoEjemplo(cambios: Partial<DatosNuevoTurno> = {}, id = "tur-1"): Turno {
  return Turno.crear(
    {
      pacienteId: "pac-1",
      fecha: new Date("2026-07-01"),
      hora: "10:00",
      duracionMinutos: 30,
      notas: null,
      ...cambios,
    },
    id,
  );
}

export function dietaEjemplo(cambios: Partial<DatosNuevaDieta> = {}, id = "die-1"): Dieta {
  let contador = 0;
  return Dieta.crear(
    {
      nombre: "Plan estándar",
      descripcion: null,
      comidas: [{ tipo: "DESAYUNO", descripcion: "Avena", calorias: 300 }],
      ...cambios,
    },
    id,
    () => `com-${++contador}`,
  );
}
