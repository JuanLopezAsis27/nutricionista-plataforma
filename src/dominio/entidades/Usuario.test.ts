import { describe, it, expect } from "vitest";
import { Usuario } from "./Usuario";
import { ErrorValidacion } from "../errores/ErrorValidacion";

function paciente(): Usuario {
  return Usuario.crear(
    { email: "ana@mail.com", passwordHash: "hash:a", rol: "PACIENTE" },
    "usr-1",
  );
}

describe("Usuario — la cuenta de un paciente", () => {
  it("no pertenece a un consultorio: sus consultorios son los de sus fichas", () => {
    expect(() =>
      Usuario.crear(
        {
          email: "ana@mail.com",
          passwordHash: "hash:a",
          rol: "PACIENTE",
          nutricionistaId: "nutri-1",
        },
        "usr-1",
      ),
    ).toThrow(ErrorValidacion);
    expect(paciente().nutricionistaId).toBeNull();
  });
});

describe("Usuario — contraseña provisional", () => {
  it("la que fija un profesional queda provisional", () => {
    const cuenta = paciente().fijarPasswordProvisional("hash:del-profesional");
    expect(cuenta.passwordProvisional).toBe(true);
    expect(cuenta.passwordHash).toBe("hash:del-profesional");
  });

  it("la que elige la persona deja de serlo", () => {
    const cuenta = paciente()
      .fijarPasswordProvisional("hash:del-profesional")
      .cambiarPassword("hash:mia");
    expect(cuenta.passwordProvisional).toBe(false);
  });

  it("re-hashear con otro costo no la vuelve propia: es la misma contraseña", () => {
    const cuenta = paciente()
      .fijarPasswordProvisional("hash:del-profesional")
      .rehashearPassword("hash:mas-caro");
    expect(cuenta.passwordProvisional).toBe(true);
  });
});

describe("Usuario — con qué se entra (migración 80)", () => {
  const crear = (datos: {
    email?: string | null;
    nombreUsuario?: string | null;
    rol?: "PACIENTE" | "NUTRICIONISTA";
  }) =>
    Usuario.crear(
      {
        passwordHash: "hash",
        rol: datos.rol ?? "PACIENTE",
        nutricionistaId: datos.rol === "NUTRICIONISTA" ? "nutri-1" : null,
        email: datos.email,
        nombreUsuario: datos.nombreUsuario,
      },
      "usr-1",
    );

  it("un paciente puede entrar solo con un nombre de usuario, que se normaliza", () => {
    const cuenta = crear({ email: null, nombreUsuario: "  Juan.Perez " });
    expect(cuenta.email).toBeNull();
    expect(cuenta.nombreUsuario).toBe("juan.perez");
    expect(cuenta.identificador).toBe("juan.perez");
  });

  it("con los dos, se muestra el email", () => {
    const cuenta = crear({ email: "ana@mail.com", nombreUsuario: "ana.g" });
    expect(cuenta.identificador).toBe("ana@mail.com");
  });

  it("sin email ni usuario no hay con qué entrar", () => {
    expect(() => crear({ email: null, nombreUsuario: null })).toThrow(
      ErrorValidacion,
    );
  });

  it("un profesional siempre tiene email", () => {
    expect(() =>
      crear({ rol: "NUTRICIONISTA", email: null, nombreUsuario: "lic.marta" }),
    ).toThrow(ErrorValidacion);
  });

  it.each(["juan@perez", "ab", "juan perez", ".juan", "juán"])(
    "rechaza el usuario «%s» (sin arroba, 3 a 30, sin espacios ni acentos)",
    (nombreUsuario) => {
      expect(() => crear({ email: null, nombreUsuario })).toThrow(
        ErrorValidacion,
      );
    },
  );
});
