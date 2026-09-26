import { describe, it, expect, vi } from "vitest";
import { ResolverConsultorioActivo } from "./ResolverConsultorioActivo";
import { CambiarConsultorioActivo } from "./CambiarConsultorioActivo";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";
import type { ConsultorioDeCuenta } from "@/dominio/repositorios/ICuentaPacienteRepositorio";
import {
  mockUsuarioRepositorio,
  mockCuentaPacienteRepositorio,
  usuarioEjemplo,
} from "../_ayudas-test";

const consultorioA: ConsultorioDeCuenta = {
  pacienteId: "pac-a",
  nutricionistaId: "nutri-a",
  nombreProfesional: "Lic. A",
  fotoProfesionalId: null,
};
const consultorioB: ConsultorioDeCuenta = {
  pacienteId: "pac-b",
  nutricionistaId: "nutri-b",
  nombreProfesional: "Lic. B",
  fotoProfesionalId: null,
};

function cuentasCon(consultorios: ConsultorioDeCuenta[]) {
  return mockCuentaPacienteRepositorio({
    listarDeUsuario: vi.fn(async () => consultorios),
  });
}

describe("ResolverConsultorioActivo", () => {
  const paciente = usuarioEjemplo({ rol: "PACIENTE" }, "usr-pac");

  function armar(consultorios: ConsultorioDeCuenta[]) {
    return new ResolverConsultorioActivo(
      mockUsuarioRepositorio({ obtenerPorId: vi.fn(async () => paciente) }),
      cuentasCon(consultorios),
    );
  }

  it("el profesional es su propio inquilino y no tiene ficha", async () => {
    const nutri = usuarioEjemplo({}, "nutri-1");
    const caso = new ResolverConsultorioActivo(
      mockUsuarioRepositorio({ obtenerPorId: vi.fn(async () => nutri) }),
      cuentasCon([]),
    );

    const identidad = await caso.ejecutar("nutri-1", null);

    expect(identidad).toMatchObject({
      rol: "NUTRICIONISTA",
      pacienteId: null,
      nutricionistaId: "nutri-1",
    });
  });

  it("un paciente con un solo consultorio arranca en ese", async () => {
    const identidad = await armar([consultorioA]).ejecutar("usr-pac", null);

    expect(identidad).toMatchObject({
      pacienteId: "pac-a",
      nutricionistaId: "nutri-a",
    });
  });

  it("con varios, respeta la elección del dispositivo si sigue siendo suya", async () => {
    const identidad = await armar([consultorioA, consultorioB]).ejecutar(
      "usr-pac",
      "pac-b",
    );

    expect(identidad).toMatchObject({
      pacienteId: "pac-b",
      nutricionistaId: "nutri-b",
    });
  });

  it("con varios y una elección ajena, queda sin consultorio (tiene que elegir)", async () => {
    // El `pacienteId` preferido llega de una cookie o del navegador: nombrar
    // la ficha de otra persona no puede abrirla.
    const identidad = await armar([consultorioA, consultorioB]).ejecutar(
      "usr-pac",
      "pac-de-otra-persona",
    );

    expect(identidad).toMatchObject({
      pacienteId: null,
      nutricionistaId: null,
    });
  });

  it("si la cuenta ya no existe, no hay identidad", async () => {
    const caso = new ResolverConsultorioActivo(
      mockUsuarioRepositorio(),
      cuentasCon([]),
    );

    expect(await caso.ejecutar("usr-borrado", null)).toBeNull();
  });
});

describe("CambiarConsultorioActivo", () => {
  it("acepta una ficha que es de la cuenta", async () => {
    const caso = new CambiarConsultorioActivo(
      cuentasCon([consultorioA, consultorioB]),
    );

    expect(await caso.ejecutar("usr-pac", "pac-b")).toBe(consultorioB);
  });

  it("rechaza una ficha que no es de la cuenta", async () => {
    const caso = new CambiarConsultorioActivo(cuentasCon([consultorioA]));

    await expect(
      caso.ejecutar("usr-pac", "pac-de-otra-persona"),
    ).rejects.toBeInstanceOf(ErrorAccesoDenegado);
  });
});
