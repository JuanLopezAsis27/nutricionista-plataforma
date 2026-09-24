import { describe, it, expect, vi } from "vitest";
import { EnviarBienvenidaMasiva } from "./EnviarBienvenidaMasiva";
import { EnviarEmailDeBienvenida } from "./EnviarEmailDeBienvenida";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import {
  mockPacienteRepositorio,
  mockPlantillaEmailRepositorio,
  mockServicioEmail,
  mockUsuarioRepositorio,
  mockHasheador,
  mockTokenRefrescoRepositorio,
  mockReloj,
  pacienteEjemplo,
  plantillaEmailEjemplo,
  usuarioEjemplo,
  mockNutricionistaConNombre,
} from "../_ayudas-test";

/** La plantilla de sistema de la bienvenida, con o sin los datos de acceso. */
function plantillaBienvenida(conContrasena: boolean) {
  return plantillaEmailEjemplo({
    clave: "BIENVENIDA",
    asunto: "¡Bienvenido/a, {{paciente}}!",
    cuerpoHtml: conContrasena
      ? "<p>Usuario: {{email}} — Contraseña: {{ contrasena }}</p>"
      : "<p>Hola {{paciente}}, ya podés entrar al portal.</p>",
  });
}

function armar(
  opciones: {
    pacientes?: IPacienteRepositorio;
    usuarios?: IUsuarioRepositorio;
    email?: IServicioEmail;
    conContrasena?: boolean;
  } = {},
) {
  const pacientes = opciones.pacientes ?? mockPacienteRepositorio();
  const usuarios = opciones.usuarios ?? mockUsuarioRepositorio();
  const email = opciones.email ?? mockServicioEmail();
  const tokensRefresco = mockTokenRefrescoRepositorio();
  const generador = { generar: vi.fn(() => "provisoria-XyZ7") };
  const plantilla = plantillaBienvenida(opciones.conContrasena ?? false);
  const caso = new EnviarBienvenidaMasiva(
    pacientes,
    new EnviarEmailDeBienvenida(
      mockPlantillaEmailRepositorio({
        obtenerPorClave: vi.fn(async () => plantilla),
      }),
      email,
      mockNutricionistaConNombre("Lic. Marta"),
    ),
    usuarios,
    mockHasheador(),
    generador,
    tokensRefresco,
    mockReloj(),
  );
  return { caso, pacientes, usuarios, email, tokensRefresco, generador };
}

function conPaciente(paciente = pacienteEjemplo()) {
  return mockPacienteRepositorio({
    obtenerPorId: vi.fn(async () => paciente),
  });
}

function cuentaDelPaciente(activa = true) {
  const cuenta = usuarioEjemplo(
    { rol: "PACIENTE", pacienteId: "pac-1", passwordHash: "hash:la-de-antes" },
    "usr-pac",
  );
  return activa ? cuenta : cuenta.cambiarActivo(false);
}

function htmlEnviado(email: IServicioEmail): string {
  return (email.enviar as ReturnType<typeof vi.fn>).mock.calls[0]![0].html;
}

describe("EnviarBienvenidaMasiva", () => {
  it("rechaza un lote vacío", async () => {
    const { caso } = armar();

    await expect(caso.ejecutar({ pacienteIds: [] })).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
  });

  it("manda y marca a quien todavía no la tenía enviada", async () => {
    const { caso, pacientes } = armar({ pacientes: conPaciente() });

    const resultado = await caso.ejecutar({ pacienteIds: ["pac-1"] });

    expect(resultado.enviados).toBe(1);
    expect(resultado.detalles[0]!.estado).toBe("ENVIADO");
    expect(pacientes.actualizar).toHaveBeenCalledOnce();
  });

  it("omite —sin remandar— a quien ya la tenía enviada, salvo que se fuerce", async () => {
    const yaEnviada = pacienteEjemplo().marcarBienvenidaEnviada(
      new Date("2026-01-01T00:00:00Z"),
    );
    const { caso, pacientes } = armar({ pacientes: conPaciente(yaEnviada) });

    const resultado = await caso.ejecutar({ pacienteIds: ["pac-1"] });

    expect(resultado.yaEnviadas).toBe(1);
    expect(resultado.omitidos).toBe(0);
    expect(resultado.detalles[0]!.estado).toBe("YA_ENVIADA");
    expect(pacientes.actualizar).not.toHaveBeenCalled();
  });

  it("con `forzar` remanda aunque ya estuviera enviada", async () => {
    const yaEnviada = pacienteEjemplo().marcarBienvenidaEnviada(
      new Date("2026-01-01T00:00:00Z"),
    );
    const { caso } = armar({ pacientes: conPaciente(yaEnviada) });

    const resultado = await caso.ejecutar({
      pacienteIds: ["pac-1"],
      forzar: true,
    });

    expect(resultado.enviados).toBe(1);
  });

  it("marca como fallido a un paciente que ya no existe, sin frenar el resto", async () => {
    const { caso } = armar({
      pacientes: mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => null),
      }),
    });

    const resultado = await caso.ejecutar({ pacienteIds: ["pac-inexistente"] });

    expect(resultado.fallidos).toBe(1);
    expect(resultado.detalles[0]!.estado).toBe("FALLIDO");
  });

  describe("cuando la plantilla lleva {{contrasena}}", () => {
    it("genera una contraseña nueva, la manda y se la asigna a la cuenta", async () => {
      const usuarios = mockUsuarioRepositorio({
        obtenerPorPacienteId: vi.fn(async () => cuentaDelPaciente()),
      });
      const { caso, email, tokensRefresco } = armar({
        pacientes: conPaciente(),
        usuarios,
        conContrasena: true,
      });

      const resultado = await caso.ejecutar({ pacienteIds: ["pac-1"] });

      expect(resultado.enviados).toBe(1);
      // Lo que se manda es lo que queda: la misma contraseña, hasheada.
      expect(htmlEnviado(email)).toContain("provisoria-XyZ7");
      const guardada = (usuarios.actualizar as ReturnType<typeof vi.fn>).mock
        .calls[0]![0];
      expect(guardada.passwordHash).toBe("hash:provisoria-XyZ7");
      // Como cualquier cambio de contraseña: se cierran las sesiones
      // persistentes que tuviera abiertas con la anterior.
      expect(tokensRefresco.revocarDeUsuario).toHaveBeenCalledWith(
        "usr-pac",
        expect.any(Date),
      );
    });

    it("si el email falla, la cuenta conserva su contraseña", async () => {
      // Guardar primero lo dejaría afuera con una contraseña que nunca le llegó.
      const usuarios = mockUsuarioRepositorio({
        obtenerPorPacienteId: vi.fn(async () => cuentaDelPaciente()),
      });
      const { caso, tokensRefresco } = armar({
        pacientes: conPaciente(),
        usuarios,
        conContrasena: true,
        email: mockServicioEmail({
          enviar: vi.fn(async () => {
            throw new Error("SMTP caído");
          }),
        }),
      });

      const resultado = await caso.ejecutar({ pacienteIds: ["pac-1"] });

      expect(resultado.fallidos).toBe(1);
      expect(usuarios.actualizar).not.toHaveBeenCalled();
      expect(tokensRefresco.revocarDeUsuario).not.toHaveBeenCalled();
    });

    it("omite al paciente sin cuenta del portal: no hay contraseña que mandarle", async () => {
      const { caso, email, generador } = armar({
        pacientes: conPaciente(),
        conContrasena: true,
      });

      const resultado = await caso.ejecutar({ pacienteIds: ["pac-1"] });

      expect(resultado.omitidos).toBe(1);
      expect(resultado.detalles[0]!.motivo).toMatch(/cuenta/);
      expect(email.enviar).not.toHaveBeenCalled();
      expect(generador.generar).not.toHaveBeenCalled();
    });

    it("con la contraseña escrita por el profesional, manda y guarda ESA en todo el lote", async () => {
      const usuarios = mockUsuarioRepositorio({
        obtenerPorPacienteId: vi.fn(async () => cuentaDelPaciente()),
      });
      const { caso, email, generador } = armar({
        pacientes: conPaciente(),
        usuarios,
        conContrasena: true,
      });

      const resultado = await caso.ejecutar({
        pacienteIds: ["pac-1", "pac-2"],
        contrasena: { modo: "MANUAL", valor: "Mi clave 2026" },
      });

      expect(resultado.enviados).toBe(2);
      expect(generador.generar).not.toHaveBeenCalled();
      expect(htmlEnviado(email)).toContain("Mi clave 2026");
      const guardadas = (
        usuarios.actualizar as ReturnType<typeof vi.fn>
      ).mock.calls.map(([u]) => u.passwordHash);
      expect(guardadas).toEqual(["hash:Mi clave 2026", "hash:Mi clave 2026"]);
    });

    it("rechaza una contraseña escrita vacía antes de mandar nada", async () => {
      const { caso, email } = armar({
        pacientes: conPaciente(),
        conContrasena: true,
      });

      await expect(
        caso.ejecutar({
          pacienteIds: ["pac-1"],
          contrasena: { modo: "MANUAL", valor: "   " },
        }),
      ).rejects.toBeInstanceOf(ErrorValidacion);
      expect(email.enviar).not.toHaveBeenCalled();
    });

    it("omite al paciente con la cuenta desactivada", async () => {
      const { caso, email } = armar({
        pacientes: conPaciente(),
        usuarios: mockUsuarioRepositorio({
          obtenerPorPacienteId: vi.fn(async () => cuentaDelPaciente(false)),
        }),
        conContrasena: true,
      });

      const resultado = await caso.ejecutar({ pacienteIds: ["pac-1"] });

      expect(resultado.omitidos).toBe(1);
      expect(email.enviar).not.toHaveBeenCalled();
    });
  });

  it("si la plantilla NO lleva {{contrasena}}, no toca la cuenta", async () => {
    const usuarios = mockUsuarioRepositorio({
      obtenerPorPacienteId: vi.fn(async () => cuentaDelPaciente()),
    });
    const { caso, generador, tokensRefresco } = armar({
      pacientes: conPaciente(),
      usuarios,
    });

    const resultado = await caso.ejecutar({ pacienteIds: ["pac-1"] });

    expect(resultado.enviados).toBe(1);
    expect(generador.generar).not.toHaveBeenCalled();
    expect(usuarios.actualizar).not.toHaveBeenCalled();
    expect(tokensRefresco.revocarDeUsuario).not.toHaveBeenCalled();
  });
});
