import { describe, it, expect, vi } from "vitest";
import { GenerarInvitacionPortal } from "./GenerarInvitacionPortal";
import type { IInvitacionPortalRepositorio } from "@/dominio/repositorios/IInvitacionPortalRepositorio";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockPacienteRepositorio,
  mockUsuarioRepositorio,
  mockCuentaPacienteRepositorio,
  mockNutricionistaConNombre,
  mockServicioEmail,
  mockReloj,
  pacienteEjemplo,
  usuarioEjemplo,
} from "../_ayudas-test";

const AHORA = new Date("2026-09-26T12:00:00Z");

function armar({
  email = "ana@mail.com",
  cuenta = null as ReturnType<typeof usuarioEjemplo> | null,
  fichas = 1,
  enviar = vi.fn(async () => {}),
} = {}) {
  const invitaciones: IInvitacionPortalRepositorio = {
    reemplazarDePaciente: vi.fn(async (i) => i),
    obtenerPorCodigoHash: vi.fn(async () => null),
    vigenteDePaciente: vi.fn(async () => null),
    marcarUsada: vi.fn(async () => {}),
  };
  const servicioEmail = mockServicioEmail({ enviar });
  const caso = new GenerarInvitacionPortal(
    mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo({ email }, "pac-1")),
    }),
    mockUsuarioRepositorio({ obtenerPorPacienteId: vi.fn(async () => cuenta) }),
    mockCuentaPacienteRepositorio({
      contarDeUsuario: vi.fn(async () => fichas),
    }),
    invitaciones,
    {
      generar: () => ({ codigo: "K7PMX3QD", hash: "hash-del-codigo" }),
      hashear: (c) => `h:${c}`,
    },
    servicioEmail,
    mockNutricionistaConNombre("Lic. Marta"),
    mockReloj(AHORA),
    "https://app.local",
  );
  return { caso, invitaciones, servicioEmail };
}

describe("GenerarInvitacionPortal", () => {
  it("guarda solo el hash, vence en 7 días y devuelve el código formateado", async () => {
    const { caso, invitaciones } = armar();

    const emitida = await caso.ejecutar({
      pacienteId: "pac-1",
      enviarPorEmail: false,
    });

    expect(emitida.codigo).toBe("K7PM-X3QD");
    expect(emitida.expiraEn).toEqual(new Date("2026-10-03T12:00:00Z"));
    expect(emitida.enviadaA).toBeNull();
    const guardada = vi.mocked(invitaciones.reemplazarDePaciente).mock
      .calls[0]![0];
    expect(guardada.codigoHash).toBe("hash-del-codigo");
    expect(guardada.pacienteId).toBe("pac-1");
  });

  it("si se pide, la manda al email de la ficha con el código y el enlace", async () => {
    const { caso, servicioEmail } = armar();

    const emitida = await caso.ejecutar({
      pacienteId: "pac-1",
      enviarPorEmail: true,
    });

    expect(emitida.enviadaA).toBe("ana@mail.com");
    const [mensaje] = vi.mocked(servicioEmail.enviar).mock.calls[0]!;
    expect(mensaje.para).toBe("ana@mail.com");
    expect(mensaje.html).toContain("K7PM-X3QD");
    expect(mensaje.html).toContain(
      "https://app.local/mis-consultorios?codigo=K7PMX3QD",
    );
  });

  it("si el email falla, el código igual se entrega (para darlo en mano)", async () => {
    const { caso } = armar({
      enviar: vi.fn(async () => {
        throw new Error("SMTP caído");
      }),
    });

    const emitida = await caso.ejecutar({
      pacienteId: "pac-1",
      enviarPorEmail: true,
    });

    expect(emitida.codigo).toBe("K7PM-X3QD");
    expect(emitida.enviadaA).toBeNull();
    expect(emitida.falloEnvio).toContain("SMTP caído");
  });

  it("sirve para juntar una cuenta EXCLUSIVA de este consultorio", async () => {
    const { caso } = armar({ cuenta: usuarioEjemplo({ rol: "PACIENTE" }) });

    await expect(
      caso.ejecutar({ pacienteId: "pac-1", enviarPorEmail: false }),
    ).resolves.toBeDefined();
  });

  it("no se emite para una ficha con cuenta compartida: mudarla le sacaría el acceso a otro", async () => {
    const { caso, invitaciones } = armar({
      cuenta: usuarioEjemplo({ rol: "PACIENTE" }),
      fichas: 2,
    });

    await expect(
      caso.ejecutar({ pacienteId: "pac-1", enviarPorEmail: false }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(invitaciones.reemplazarDePaciente).not.toHaveBeenCalled();
  });
});
