import { describe, it, expect, vi } from "vitest";
import { ActualizarPaciente } from "./ActualizarPaciente";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import {
  mockPacienteRepositorio,
  mockUsuarioRepositorio,
  mockCuentaPacienteRepositorio,
  pacienteEjemplo,
  usuarioEjemplo,
  mockConfiguracionRepositorio,
} from "../_ayudas-test";

describe("ActualizarPaciente", () => {
  it("actualiza los datos de un paciente existente", async () => {
    const repositorio = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo({}, "pac-1")),
    });
    const casoUso = new ActualizarPaciente(
      repositorio,
      mockUsuarioRepositorio(),
      mockCuentaPacienteRepositorio(),
      mockConfiguracionRepositorio(),
    );

    const actualizado = await casoUso.ejecutar({
      id: "pac-1",
      nombre: "Anita",
    });

    expect(actualizado.nombre).toBe("Anita");
    expect(repositorio.actualizar).toHaveBeenCalledOnce();
  });

  it("lleva el testigo de versión hasta el repositorio", async () => {
    // El bloqueo optimista se impone en el WHERE del UPDATE, así que lo único
    // que el caso de uso tiene que garantizar es que el testigo LLEGUE. Si se
    // pierde en el camino la escritura entra igual y vuelve el lost update,
    // sin que falle nada.
    const repositorio = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo({}, "pac-1")),
    });
    const casoUso = new ActualizarPaciente(
      repositorio,
      mockUsuarioRepositorio(),
      mockCuentaPacienteRepositorio(),
      mockConfiguracionRepositorio(),
    );
    const abiertaEn = new Date("2026-03-01T10:00:00.000Z");

    await casoUso.ejecutar({
      id: "pac-1",
      notas: "algo",
      actualizadoEn: abiertaEn,
    });

    const [, esperadoEn] = vi.mocked(repositorio.actualizar).mock.calls[0]!;
    expect(esperadoEn).toEqual(abiertaEn);
  });

  it("sin testigo escribe igual: las mutaciones de un campo no se frenan", async () => {
    // Archivar o marcar la bienvenida no salen de un formulario y no tienen de
    // dónde sacar el testigo. Exigirlo las rompería a todas.
    const repositorio = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo({}, "pac-1")),
    });
    const casoUso = new ActualizarPaciente(
      repositorio,
      mockUsuarioRepositorio(),
      mockCuentaPacienteRepositorio(),
      mockConfiguracionRepositorio(),
    );

    await casoUso.ejecutar({ id: "pac-1", notas: "algo" });

    const [, esperadoEn] = vi.mocked(repositorio.actualizar).mock.calls[0]!;
    expect(esperadoEn).toBeUndefined();
  });

  it("el testigo no se guarda como si fuera un dato del paciente", async () => {
    // `actualizadoEn` entra por el mismo objeto que los campos editables y la
    // entidad lo fija ella misma al actualizar. Colarlo en los cambios haría
    // que la ficha quedara marcada con la fecha en que se ABRIÓ.
    const repositorio = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo({}, "pac-1")),
    });
    const casoUso = new ActualizarPaciente(
      repositorio,
      mockUsuarioRepositorio(),
      mockCuentaPacienteRepositorio(),
      mockConfiguracionRepositorio(),
    );
    const abiertaEn = new Date("2020-01-01T00:00:00.000Z");

    const guardado = await casoUso.ejecutar({
      id: "pac-1",
      notas: "algo",
      actualizadoEn: abiertaEn,
    });

    expect(guardado.actualizadoEn).not.toEqual(abiertaEn);
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const repositorio = mockPacienteRepositorio();
    const casoUso = new ActualizarPaciente(
      repositorio,
      mockUsuarioRepositorio(),
      mockCuentaPacienteRepositorio(),
      mockConfiguracionRepositorio(),
    );

    await expect(
      casoUso.ejecutar({ id: "x", nombre: "Z" }),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });

  it("acepta el email de otro paciente: es de contacto (hermanos con el de la madre)", async () => {
    const repositorio = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () =>
        pacienteEjemplo({ email: "ana@mail.com" }, "pac-1"),
      ),
    });
    const casoUso = new ActualizarPaciente(
      repositorio,
      mockUsuarioRepositorio(),
      mockCuentaPacienteRepositorio(),
      mockConfiguracionRepositorio(),
    );

    const guardado = await casoUso.ejecutar({
      id: "pac-1",
      email: "mama@mail.com",
    });

    expect(guardado.email).toBe("mama@mail.com");
  });

  it("puede quedar sin email", async () => {
    const repositorio = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () =>
        pacienteEjemplo({ email: "ana@mail.com" }, "pac-1"),
      ),
    });
    const usuarios = mockUsuarioRepositorio();
    const casoUso = new ActualizarPaciente(
      repositorio,
      usuarios,
      mockCuentaPacienteRepositorio(),
      mockConfiguracionRepositorio(),
    );

    const guardado = await casoUso.ejecutar({ id: "pac-1", email: null });

    expect(guardado.email).toBeNull();
    // Borrarlo de la ficha no le quita a la cuenta con qué entrar.
    expect(usuarios.actualizar).not.toHaveBeenCalled();
  });

  describe("el email de la cuenta (una cuenta, varios consultorios)", () => {
    const cuenta = usuarioEjemplo(
      { email: "ana@mail.com", rol: "PACIENTE" },
      "usr-1",
    );

    function armar({
      fichas = 1,
      emailTomado = false,
    }: { fichas?: number; emailTomado?: boolean } = {}) {
      const usuarios = mockUsuarioRepositorio({
        obtenerPorPacienteId: vi.fn(async () => cuenta),
        emailYaRegistrado: vi.fn(async () => emailTomado),
      });
      const repositorio = mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () =>
          pacienteEjemplo({ email: "ana@mail.com" }, "pac-1"),
        ),
      });
      const caso = new ActualizarPaciente(
        repositorio,
        usuarios,
        mockCuentaPacienteRepositorio({
          contarDeUsuario: vi.fn(async () => fichas),
        }),
        mockConfiguracionRepositorio(),
      );
      return { caso, usuarios, repositorio };
    }

    it("sincroniza el email de la cuenta si es solo de este consultorio", async () => {
      const { caso, usuarios } = armar();

      await caso.ejecutar({ id: "pac-1", email: "nueva@mail.com" });

      expect(usuarios.actualizar).toHaveBeenCalledOnce();
      const guardada = vi.mocked(usuarios.actualizar).mock.calls[0]![0];
      expect(guardada.email).toBe("nueva@mail.com");
    });

    it("con la cuenta compartida cambia la ficha y NO el login", async () => {
      // El login es de la persona: cambiarlo desde acá se lo cambiaría en el
      // otro consultorio también.
      const { caso, usuarios, repositorio } = armar({ fichas: 2 });

      await caso.ejecutar({ id: "pac-1", email: "nueva@mail.com" });

      expect(repositorio.actualizar).toHaveBeenCalledOnce();
      expect(usuarios.actualizar).not.toHaveBeenCalled();
    });

    it("si el email nuevo ya es de otra cuenta, cambia el de contacto y no el login", async () => {
      // El de ingreso es único en la plataforma; el de contacto se puede
      // repetir (migración 79). Antes esto se rechazaba.
      const { caso, usuarios, repositorio } = armar({ emailTomado: true });

      await caso.ejecutar({ id: "pac-1", email: "tomado@mail.com" });

      expect(repositorio.actualizar).toHaveBeenCalledOnce();
      expect(usuarios.actualizar).not.toHaveBeenCalled();
    });

    it("no toca una cuenta que entra con otra cosa (usuario u otro email)", async () => {
      const conUsuario = usuarioEjemplo(
        { email: null, nombreUsuario: "ana.gomez", rol: "PACIENTE" },
        "usr-2",
      );
      const usuarios = mockUsuarioRepositorio({
        obtenerPorPacienteId: vi.fn(async () => conUsuario),
      });
      const caso = new ActualizarPaciente(
        mockPacienteRepositorio({
          obtenerPorId: vi.fn(async () =>
            pacienteEjemplo({ email: "ana@mail.com" }, "pac-1"),
          ),
        }),
        usuarios,
        mockCuentaPacienteRepositorio(),
        mockConfiguracionRepositorio(),
      );

      await caso.ejecutar({ id: "pac-1", email: "nueva@mail.com" });

      expect(usuarios.actualizar).not.toHaveBeenCalled();
    });
  });
});
