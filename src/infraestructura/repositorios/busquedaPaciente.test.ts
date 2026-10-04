import { describe, it, expect } from "vitest";
import { condicionBusquedaPaciente } from "./PrismaRepositorioPaciente";

describe("condicionBusquedaPaciente", () => {
  it("sin texto (o solo espacios) no filtra", () => {
    expect(condicionBusquedaPaciente(undefined)).toBeNull();
    expect(condicionBusquedaPaciente("   ")).toBeNull();
  });

  it("pide CADA palabra en nombre, apellido o email", () => {
    // «juan lopez» entero no está en ningún campo: tiene que ir palabra por
    // palabra para encontrar a Juan López.
    const condicion = condicionBusquedaPaciente("juan lopez");

    expect(condicion).toHaveLength(2);
    expect(condicion![0]).toEqual({
      OR: [
        { nombre: { contains: "juan", mode: "insensitive" } },
        { apellido: { contains: "juan", mode: "insensitive" } },
        { email: { contains: "juan", mode: "insensitive" } },
      ],
    });
    expect(JSON.stringify(condicion![1])).toContain('"lopez"');
  });

  it("un espacio al final o repetido no agrega una palabra vacía", () => {
    expect(condicionBusquedaPaciente("juan ")).toHaveLength(1);
    expect(condicionBusquedaPaciente("  juan   lopez ")).toHaveLength(2);
  });
});
