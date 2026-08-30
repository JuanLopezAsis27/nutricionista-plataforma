import { describe, it, expect, vi } from "vitest";
import { EnviarMensaje } from "./EnviarMensaje";
import { Usuario } from "@/dominio/entidades/Usuario";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockMensajeriaRepositorio,
  mockUsuarioRepositorio,
  mockBusEventos,
  conversacionEjemplo,
} from "../_ayudas-test";

const usuarioNutri = Usuario.reconstruir({
  id: "usr-nutri",
  email: "nutri@demo.com",
  passwordHash: "x",
  rol: "NUTRICIONISTA",
  pacienteId: null,
  nutricionistaId: "usr-nutri",
  activo: true,
  creadoEn: new Date(),
});
const usuarioPaciente = Usuario.reconstruir({
  id: "usr-pac",
  email: "pac@demo.com",
  passwordHash: "x",
  rol: "PACIENTE",
  pacienteId: "pac-1",
  nutricionistaId: "usr-nutri",
  activo: true,
  creadoEn: new Date(),
});

describe("EnviarMensaje", () => {
  it("del paciente: crea la conversación si no existe y notifica al nutricionista", async () => {
    const crearConversacion = vi.fn(async () => conversacionEjemplo());
    const repo = mockMensajeriaRepositorio({
      obtenerConversacionPorPaciente: vi.fn(async () => null),
      crearConversacion,
    });
    const usuarios = mockUsuarioRepositorio({
      listarPorRol: vi.fn(async () => [usuarioNutri]),
    });
    const publicar = vi.fn(async () => {});
    const bus = mockBusEventos({ publicar });

    const mensaje = await new EnviarMensaje(repo, usuarios, bus).ejecutar({
      autorId: "usr-pac",
      autorEsNutricionista: false,
      pacienteId: "pac-1",
      cuerpo: "Hola, tengo una duda",
    });

    expect(crearConversacion).toHaveBeenCalledOnce();
    expect(mensaje.cuerpo).toBe("Hola, tengo una duda");
    expect(publicar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: "mensaje.nuevo",
        usuarioId: "usr-nutri",
      }),
    );
  });

  it("del nutricionista: reutiliza la conversación y notifica al paciente", async () => {
    const crearConversacion = vi.fn();
    const repo = mockMensajeriaRepositorio({
      obtenerConversacionPorPaciente: vi.fn(async () => conversacionEjemplo()),
      crearConversacion,
    });
    const usuarios = mockUsuarioRepositorio({
      obtenerPorPacienteId: vi.fn(async () => usuarioPaciente),
    });
    const publicar = vi.fn(async () => {});

    await new EnviarMensaje(
      repo,
      usuarios,
      mockBusEventos({ publicar }),
    ).ejecutar({
      autorId: "usr-nutri",
      autorEsNutricionista: true,
      pacienteId: "pac-1",
      cuerpo: "Todo bien, seguí así",
    });

    expect(crearConversacion).not.toHaveBeenCalled();
    expect(publicar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "mensaje.nuevo", usuarioId: "usr-pac" }),
    );
  });

  it("no notifica al propio autor (nutri escribiéndose a sí mismo no aplica)", async () => {
    const repo = mockMensajeriaRepositorio({
      obtenerConversacionPorPaciente: vi.fn(async () => conversacionEjemplo()),
    });
    const usuarios = mockUsuarioRepositorio({
      listarPorRol: vi.fn(async () => [usuarioNutri]),
    });
    const publicar = vi.fn(async () => {});

    await new EnviarMensaje(
      repo,
      usuarios,
      mockBusEventos({ publicar }),
    ).ejecutar({
      autorId: "usr-nutri", // el autor está entre los nutris
      autorEsNutricionista: false,
      pacienteId: "pac-1",
      cuerpo: "test",
    });

    expect(publicar).not.toHaveBeenCalled();
  });

  it("rechaza un mensaje vacío", async () => {
    await expect(
      new EnviarMensaje(
        mockMensajeriaRepositorio({
          obtenerConversacionPorPaciente: vi.fn(async () =>
            conversacionEjemplo(),
          ),
        }),
        mockUsuarioRepositorio(),
        mockBusEventos(),
      ).ejecutar({
        autorId: "usr-pac",
        autorEsNutricionista: false,
        pacienteId: "pac-1",
        cuerpo: "   ",
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});
