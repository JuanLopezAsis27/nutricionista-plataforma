import { describe, it, expect, vi } from "vitest";
import { CanjearInvitacionPortal } from "./CanjearInvitacionPortal";
import { InvitacionPortal } from "@/dominio/entidades/InvitacionPortal";
import type { IInvitacionPortalRepositorio } from "@/dominio/repositorios/IInvitacionPortalRepositorio";
import type { IGeneradorCodigoInvitacion } from "@/dominio/servicios/IGeneradorCodigoInvitacion";
import type { ConsultorioDeCuenta } from "@/dominio/repositorios/ICuentaPacienteRepositorio";
import { ErrorInvitacionInvalida } from "@/dominio/errores/ErrorInvitacionInvalida";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockPacienteRepositorio,
  mockUsuarioRepositorio,
  mockCuentaPacienteRepositorio,
  mockNutricionistaConNombre,
  mockReloj,
  pacienteEjemplo,
  usuarioEjemplo,
} from "../_ayudas-test";

const AHORA = new Date("2026-09-26T12:00:00Z");
const CODIGO = "K7PMX3QD";

const invitacion = (cambios: { expiraEn?: Date; usadaEn?: Date | null } = {}) =>
  InvitacionPortal.reconstruir({
    id: "inv-1",
    pacienteId: "pac-b",
    codigoHash: `h:${CODIGO}`,
    expiraEn: cambios.expiraEn ?? new Date("2026-10-01T00:00:00Z"),
    usadaEn: cambios.usadaEn ?? null,
    creadoEn: new Date("2026-09-24T00:00:00Z"),
  });

const generador: IGeneradorCodigoInvitacion = {
  generar: () => ({ codigo: CODIGO, hash: `h:${CODIGO}` }),
  hashear: (codigo) => `h:${codigo}`,
};

/** Consultorio B emitió el código para su ficha `pac-b`. */
function armar({
  encontrada = invitacion(),
  anterior = null,
  fichasDeAnterior = 1,
  consultoriosDeQuienCanjea = [{ nutricionistaId: "nutri-a" }],
}: {
  encontrada?: InvitacionPortal | null;
  anterior?: ReturnType<typeof usuarioEjemplo> | null;
  fichasDeAnterior?: number;
  consultoriosDeQuienCanjea?: Partial<ConsultorioDeCuenta>[];
} = {}) {
  const invitaciones: IInvitacionPortalRepositorio = {
    reemplazarDePaciente: vi.fn(async (i) => i),
    obtenerPorCodigoHash: vi.fn(async (hash: string) =>
      encontrada && hash === encontrada.codigoHash
        ? { invitacion: encontrada, nutricionistaId: "nutri-b" }
        : null,
    ),
    vigenteDePaciente: vi.fn(async () => null),
    marcarUsada: vi.fn(async () => {}),
  };
  const usuarios = mockUsuarioRepositorio({
    obtenerPorPacienteId: vi.fn(async () => anterior),
  });
  const cuentas = mockCuentaPacienteRepositorio({
    contarDeUsuario: vi.fn(async () => fichasDeAnterior),
    listarDeUsuario: vi.fn(
      async () => consultoriosDeQuienCanjea as ConsultorioDeCuenta[],
    ),
  });
  const caso = new CanjearInvitacionPortal(
    invitaciones,
    generador,
    mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () =>
        pacienteEjemplo({ nombre: "Sofía", apellido: "Pérez" }, "pac-b"),
      ),
    }),
    usuarios,
    cuentas,
    mockNutricionistaConNombre("Lic. Marta"),
    mockReloj(AHORA),
  );
  return { caso, invitaciones, usuarios, cuentas };
}

describe("CanjearInvitacionPortal", () => {
  it("ubica el consultorio del código, sin importar guiones ni minúsculas", async () => {
    const { caso } = armar();

    expect(await caso.ubicar("k7pm-x3qd")).toBe("nutri-b");
  });

  it("muestra de qué profesional es y a nombre de quién está la ficha", async () => {
    const { caso } = armar();

    expect(await caso.previsualizar("usr-yo", CODIGO)).toEqual({
      nombreProfesional: "Lic. Marta",
      nombrePaciente: "Sofía Pérez",
    });
  });

  it("canjea: la ficha queda en la cuenta de quien canjea y la invitación se usa", async () => {
    const { caso, invitaciones, cuentas, usuarios } = armar();

    const pacienteId = await caso.canjear("usr-yo", CODIGO);

    expect(pacienteId).toBe("pac-b");
    expect(cuentas.vincular).toHaveBeenCalledWith("usr-yo", "pac-b");
    expect(invitaciones.marcarUsada).toHaveBeenCalledWith("inv-1", AHORA);
    expect(usuarios.eliminar).not.toHaveBeenCalled();
  });

  it("junta cuentas: si la ficha tenía una cuenta exclusiva, la muda y borra la vieja", async () => {
    const vieja = usuarioEjemplo(
      { rol: "PACIENTE", email: null, nombreUsuario: "sofi.perez" },
      "usr-vieja",
    );
    const { caso, cuentas, usuarios } = armar({ anterior: vieja });

    await caso.canjear("usr-yo", CODIGO);

    expect(cuentas.vincular).toHaveBeenCalledWith("usr-yo", "pac-b");
    expect(usuarios.eliminar).toHaveBeenCalledWith("usr-vieja");
  });

  it("nunca muda una ficha cuya cuenta es compartida con otro consultorio", async () => {
    const compartida = usuarioEjemplo({ rol: "PACIENTE" }, "usr-compartida");
    const { caso, cuentas, usuarios } = armar({
      anterior: compartida,
      fichasDeAnterior: 2,
    });

    await expect(caso.canjear("usr-yo", CODIGO)).rejects.toBeInstanceOf(
      ErrorInvitacionInvalida,
    );
    expect(cuentas.vincular).not.toHaveBeenCalled();
    expect(usuarios.eliminar).not.toHaveBeenCalled();
  });

  it("rechaza si la cuenta ya tiene una ficha en ese consultorio", async () => {
    const { caso, cuentas } = armar({
      consultoriosDeQuienCanjea: [{ nutricionistaId: "nutri-b" }],
    });

    await expect(caso.canjear("usr-yo", CODIGO)).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
    expect(cuentas.vincular).not.toHaveBeenCalled();
  });

  it.each([
    ["inexistente", { encontrada: null }],
    [
      "vencido",
      { encontrada: invitacion({ expiraEn: new Date("2026-09-01") }) },
    ],
    [
      "ya usado",
      { encontrada: invitacion({ usadaEn: new Date("2026-09-25") }) },
    ],
  ])(
    "un código %s da el MISMO error, sin decir cuál de los tres",
    async (_c, opciones) => {
      const { caso, cuentas } = armar(opciones);

      await expect(caso.canjear("usr-yo", CODIGO)).rejects.toBeInstanceOf(
        ErrorInvitacionInvalida,
      );
      expect(cuentas.vincular).not.toHaveBeenCalled();
    },
  );

  it("un texto que no tiene forma de código ni llega a buscarse", async () => {
    const { caso, invitaciones } = armar();

    await expect(caso.ubicar("hola")).rejects.toBeInstanceOf(
      ErrorInvitacionInvalida,
    );
    expect(invitaciones.obtenerPorCodigoHash).not.toHaveBeenCalled();
  });
});
