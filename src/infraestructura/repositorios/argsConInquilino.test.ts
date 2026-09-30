import { describe, it, expect } from "vitest";
import { argsConInquilino } from "./PrismaClienteSingleton";
import type { AlcanceTenant } from "@/infraestructura/multitenancy/contextoTenant";

/**
 * El aislamiento entre consultorios, operación por operación.
 *
 * Es lo que hace que ningún repositorio tenga que escribir el filtro de
 * inquilino: si esta transformación se equivoca en UNA operación, esa
 * operación cruza datos entre consultorios sin ningún error.
 */

const CONSULTORIO_A: AlcanceTenant = {
  tipo: "nutricionista",
  nutricionistaId: "nutri-a",
};
const GLOBAL: AlcanceTenant = { tipo: "global" };

describe("argsConInquilino — fail-closed", () => {
  it("sin alcance, tocar una tabla de inquilino LANZA", () => {
    expect(() =>
      argsConInquilino("Paciente", "findMany", {}, undefined),
    ).toThrow(/sin contexto de inquilino/);
  });

  it("lanza también al escribir, no solo al leer", () => {
    expect(() =>
      argsConInquilino("Turno", "create", { data: {} }, undefined),
    ).toThrow();
    expect(() =>
      argsConInquilino("Archivo", "deleteMany", {}, undefined),
    ).toThrow();
  });

  it("una tabla que no es de inquilino pasa sin alcance y sin tocarse", () => {
    const args = { where: { id: "x" } };
    expect(argsConInquilino("AlimentoBase", "findMany", args, undefined)).toBe(
      args,
    );
  });
});

describe("argsConInquilino — alcance global", () => {
  it("no agrega ningún filtro (login, webhook, barridos del worker)", () => {
    const args = { where: { email: "a@b.com" } };
    expect(argsConInquilino("Usuario", "findFirst", args, GLOBAL)).toEqual({
      where: { email: "a@b.com" },
    });
  });
});

describe("argsConInquilino — dentro de un consultorio", () => {
  it.each([
    "findMany",
    "findFirst",
    "findUnique",
    "findFirstOrThrow",
    "findUniqueOrThrow",
    "count",
    "aggregate",
    "groupBy",
    "update",
    "updateMany",
    "delete",
    "deleteMany",
  ])("%s suma el inquilino al where", (operacion) => {
    const resultado = argsConInquilino(
      "Paciente",
      operacion,
      { where: { id: "pac-1" } },
      CONSULTORIO_A,
    );
    expect(resultado).toMatchObject({
      where: { id: "pac-1", nutricionistaId: "nutri-a" },
    });
  });

  it("sin where también filtra: un findMany pelado no devuelve la tabla entera", () => {
    expect(
      argsConInquilino("Mensaje", "findMany", undefined, CONSULTORIO_A),
    ).toEqual({ where: { nutricionistaId: "nutri-a" } });
  });

  it("el inquilino del alcance le gana al que venga en el where", () => {
    // Un id de otro consultorio metido en el filtro no puede ampliar la consulta.
    const resultado = argsConInquilino(
      "Receta",
      "findMany",
      { where: { nutricionistaId: "nutri-b" } },
      CONSULTORIO_A,
    );
    expect(resultado).toEqual({ where: { nutricionistaId: "nutri-a" } });
  });

  it("create asigna el inquilino, pisando uno ajeno", () => {
    const resultado = argsConInquilino(
      "Turno",
      "create",
      { data: { hora: "10:00", nutricionistaId: "nutri-b" } },
      CONSULTORIO_A,
    );
    expect(resultado).toEqual({
      data: { hora: "10:00", nutricionistaId: "nutri-a" },
    });
  });

  it("createMany asigna el inquilino a CADA fila", () => {
    const resultado = argsConInquilino(
      "AsignacionReceta",
      "createMany",
      {
        data: [{ pacienteId: "p1" }, { pacienteId: "p2" }],
        skipDuplicates: true,
      },
      CONSULTORIO_A,
    );
    expect(resultado).toEqual({
      data: [
        { pacienteId: "p1", nutricionistaId: "nutri-a" },
        { pacienteId: "p2", nutricionistaId: "nutri-a" },
      ],
      skipDuplicates: true,
    });
  });

  it("createMany con una sola fila (objeto, no arreglo) también la asigna", () => {
    expect(
      argsConInquilino(
        "Notificacion",
        "createMany",
        { data: { texto: "x" } },
        CONSULTORIO_A,
      ),
    ).toEqual({ data: { texto: "x", nutricionistaId: "nutri-a" } });
  });

  it("upsert filtra el where Y asigna el create", () => {
    // Sin el where, un upsert por id de otro consultorio le actualizaría la fila.
    const resultado = argsConInquilino(
      "ConfiguracionRecordatorios",
      "upsert",
      {
        where: { id: "cfg" },
        create: { activo: true },
        update: { activo: false },
      },
      CONSULTORIO_A,
    );
    expect(resultado).toEqual({
      where: { id: "cfg", nutricionistaId: "nutri-a" },
      create: { activo: true, nutricionistaId: "nutri-a" },
      update: { activo: false },
    });
  });

  it("no muta los args que recibe", () => {
    const args = { where: { id: "pac-1" } };
    argsConInquilino("Paciente", "findUnique", args, CONSULTORIO_A);
    expect(args).toEqual({ where: { id: "pac-1" } });
  });
});
