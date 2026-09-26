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
