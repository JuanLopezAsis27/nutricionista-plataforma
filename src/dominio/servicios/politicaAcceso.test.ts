import { describe, it, expect } from "vitest";
import { pacienteDeSesion, pacienteConsultable } from "./politicaAcceso";
import { ErrorAccesoDenegado } from "../errores/ErrorAccesoDenegado";

/**
 * La regla "un paciente solo accede a sus propios datos" vivía repetida en
 * once routers y no tenía ni un test. Estos son esos tests.
 */

const nutricionista = { rol: "NUTRICIONISTA" as const, pacienteId: null };
const paciente = { rol: "PACIENTE" as const, pacienteId: "pac-1" };
const superadmin = { rol: "SUPERADMIN" as const, pacienteId: null };

describe("pacienteDeSesion", () => {
  it("devuelve el paciente asociado a la sesión", () => {
    expect(pacienteDeSesion(paciente)).toBe("pac-1");
  });

  it("rechaza a un usuario sin paciente asociado", () => {
    expect(() => pacienteDeSesion(nutricionista)).toThrow(ErrorAccesoDenegado);
    expect(() => pacienteDeSesion(superadmin)).toThrow(ErrorAccesoDenegado);
  });

  it("clasifica el error como ACCESO_DENEGADO (403, no 500)", () => {
    try {
      pacienteDeSesion(nutricionista);
      expect.unreachable("debería haber lanzado");
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorAccesoDenegado);
      expect((error as ErrorAccesoDenegado).codigo).toBe("ACCESO_DENEGADO");
    }
  });
});

describe("pacienteConsultable", () => {
  it("el nutricionista consulta el paciente que pide", () => {
    expect(pacienteConsultable(nutricionista, "pac-9")).toBe("pac-9");
  });

  it("el nutricionista debe indicar un paciente", () => {
    expect(() => pacienteConsultable(nutricionista, null)).toThrow(
      ErrorAccesoDenegado,
    );
    expect(() => pacienteConsultable(nutricionista, undefined)).toThrow(
      ErrorAccesoDenegado,
    );
  });

  it("el paciente queda acotado al suyo aunque no pida ninguno", () => {
    expect(pacienteConsultable(paciente, undefined)).toBe("pac-1");
  });

  it("el paciente puede pedir el suyo explícitamente", () => {
    expect(pacienteConsultable(paciente, "pac-1")).toBe("pac-1");
  });

  it("NO deja que un paciente pida los datos de otro", () => {
    // El caso que de verdad importa: sin esta rama, cualquier paciente leería
    // los datos de cualquier otro pasando su id.
    expect(() => pacienteConsultable(paciente, "pac-2")).toThrow(
      ErrorAccesoDenegado,
    );
  });

  it("usa el nombre del recurso en el mensaje", () => {
    expect(() => pacienteConsultable(paciente, "pac-2", "turnos")).toThrow(
      "Solo podés ver tus propios turnos.",
    );
  });

  it("no le da acceso al superadmin por la puerta del paciente", () => {
    // El superadmin gestiona cuentas, no historias clínicas: acá no pasa.
    expect(() => pacienteConsultable(superadmin, "pac-1")).toThrow(
      ErrorAccesoDenegado,
    );
  });
});
