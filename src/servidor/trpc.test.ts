import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { ZodError, z } from "zod";

const capturar = vi.fn();
vi.mock("@/infraestructura/monitoreo/monitor", () => ({
  monitorErrores: { capturar: (...args: unknown[]) => capturar(...args) },
}));

/**
 * El traductor de errores de la base, doblado.
 *
 * Se dobla y no se usa el real porque el real importa Prisma, y Prisma no
 * puede entrar en `src/servidor` (ver `arquitectura.test.ts`). Acá se verifica
 * que el middleware lo CONSULTE y respete lo que devuelve; qué devuelve para
 * cada código de Prisma es cosa de `erroresPrisma.test.ts`.
 */
vi.mock("@/infraestructura/persistencia/erroresPrisma", () => ({
  traducirErrorPrisma: (error: unknown) =>
    error instanceof Error && error.message.includes("Unique constraint")
      ? {
          codigo: "CONFLICTO",
          message: "Ya existe un registro con ese email. Revisá los datos.",
        }
      : null,
}));

import { crearRouter, crearCallerFactory, publicoProcedimiento } from "./trpc";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import type { Contexto } from "./contexto";

/**
 * El middleware único de errores de tRPC.
 *
 * Este test existe por un bug que estuvo vivo y en producción: el middleware
 * envolvía `await next()` en un try/catch, pero en tRPC v11 `next()` NO lanza
 * cuando el resolver falla — devuelve `{ ok: false, error }`. El catch nunca
 * se ejecutaba, así que NINGÚN error de dominio se traducía: todos salían como
 * 500 y, peor, todos se reportaban al monitor como si fueran bugs inesperados.
 *
 * Se veía sano leyendo el código y solo se detectaba llamando de verdad, que
 * es lo que hace este archivo.
 */

/** Router de prueba: un procedimiento por forma de fallar. */
const routerPrueba = crearRouter({
  accesoDenegado: publicoProcedimiento.query(() => {
    throw new ErrorAccesoDenegado("Solo podés ver tus propios datos.");
  }),
  noEncontrado: publicoProcedimiento.query(() => {
    throw new ErrorPacienteNoEncontrado("pac-1");
  }),
  validacion: publicoProcedimiento.query(() => {
    throw new ErrorValidacion("El peso debe estar entre 20 y 400 kg.");
  }),
  trpcDeliberado: publicoProcedimiento.query(() => {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Necesitás iniciar sesión.",
    });
  }),
  errorInesperado: publicoProcedimiento.query(() => {
    throw new Error("connect ECONNREFUSED 10.0.0.5:5432");
  }),
  conInput: publicoProcedimiento
    .input(z.object({ edad: z.number().int().positive() }))
    .query(({ input }) => input.edad),
  restriccionBase: publicoProcedimiento.query(() => {
    // Se imita el error crudo en vez de construir uno de Prisma: el ORM no
    // puede importarse fuera de la infraestructura (`arquitectura.test.ts`),
    // y lo que este archivo verifica es el CABLEADO del middleware. Que un
    // P2002 real se traduzca a este mensaje lo cubre `erroresPrisma.test.ts`,
    // que sí vive en infraestructura.
    throw new Error("Unique constraint failed on the fields: (`email`)");
  }),
  exitoso: publicoProcedimiento.query(() => "todo bien"),
  asincrono: publicoProcedimiento.query(async () => {
    await Promise.resolve();
    throw new ErrorAccesoDenegado("Denegado desde una promesa.");
  }),
});

const llamar = crearCallerFactory(routerPrueba)({} as Contexto);

/** Ejecuta y devuelve el TRPCError resultante. */
async function errorDe(fn: () => Promise<unknown>): Promise<TRPCError> {
  try {
    await fn();
  } catch (error) {
    return error as TRPCError;
  }
  throw new Error("se esperaba un error y no hubo ninguno");
}

beforeEach(() => capturar.mockClear());

describe("middleware de errores de tRPC", () => {
  it("no toca los llamados que salen bien", async () => {
    expect(await llamar.exitoso()).toBe("todo bien");
    expect(capturar).not.toHaveBeenCalled();
  });

  describe("errores de dominio → su código semántico", () => {
    it("ACCESO_DENEGADO → FORBIDDEN", async () => {
      const error = await errorDe(() => llamar.accesoDenegado());

      expect(error.code).toBe("FORBIDDEN");
      expect(error.message).toBe("Solo podés ver tus propios datos.");
    });

    it("NO_ENCONTRADO → NOT_FOUND", async () => {
      const error = await errorDe(() => llamar.noEncontrado());
      expect(error.code).toBe("NOT_FOUND");
    });

    it("VALIDACION → BAD_REQUEST", async () => {
      const error = await errorDe(() => llamar.validacion());

      expect(error.code).toBe("BAD_REQUEST");
      // El mensaje del dominio llega al cliente: es lo que se le muestra.
      expect(error.message).toBe("El peso debe estar entre 20 y 400 kg.");
    });

    it("también traduce si el resolver es asíncrono", async () => {
      const error = await errorDe(() => llamar.asincrono());
      expect(error.code).toBe("FORBIDDEN");
    });

    it("conserva el error original como cause (lo lee el errorFormatter)", async () => {
      const error = await errorDe(() => llamar.accesoDenegado());
      expect(error.cause).toBeInstanceOf(ErrorAccesoDenegado);
    });

    it("NO los reporta al monitor: son flujo esperado, no bugs", async () => {
      await errorDe(() => llamar.accesoDenegado());
      await errorDe(() => llamar.noEncontrado());
      await errorDe(() => llamar.validacion());

      expect(capturar).not.toHaveBeenCalled();
    });
  });

  describe("errores de transporte", () => {
    it("deja pasar un TRPCError lanzado a propósito", async () => {
      const error = await errorDe(() => llamar.trpcDeliberado());

      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.message).toBe("Necesitás iniciar sesión.");
      expect(capturar).not.toHaveBeenCalled();
    });

    it("deja pasar la validación Zod del input como BAD_REQUEST", async () => {
      // @ts-expect-error se pasa un input inválido a propósito.
      const error = await errorDe(() => llamar.conInput({ edad: "treinta" }));

      expect(error.code).toBe("BAD_REQUEST");
      expect(error.cause).toBeInstanceOf(ZodError);
      expect(capturar).not.toHaveBeenCalled();
    });
  });

  describe("errores inesperados", () => {
    it("los reporta al monitor con la ruta y el usuario", async () => {
      await errorDe(() => llamar.errorInesperado());

      expect(capturar).toHaveBeenCalledOnce();
      const [error, contexto] = capturar.mock.calls[0]!;
      expect((error as Error).message).toContain("ECONNREFUSED");
      expect(contexto).toMatchObject({
        origen: "trpc",
        ruta: "errorInesperado",
      });
    });

    it("NO filtra al cliente el detalle interno", async () => {
      const error = await errorDe(() => llamar.errorInesperado());

      expect(error.code).toBe("INTERNAL_SERVER_ERROR");
      // El host y el puerto de la base no pueden viajar al navegador.
      expect(error.message).not.toContain("ECONNREFUSED");
      expect(error.message).not.toContain("10.0.0.5");
    });

    it("conserva el original en cause para los logs del servidor", async () => {
      const error = await errorDe(() => llamar.errorInesperado());
      expect((error.cause as Error).message).toContain("ECONNREFUSED");
    });
  });
});

describe("traducción de errores de la base", () => {
  beforeEach(() => capturar.mockClear());

  it("un choque de índice único se explica en vez de salir como 500 genérico", async () => {
    // Antes esto caía en el catch-all y el profesional leía «Ocurrió un error
    // inesperado. Volvé a intentarlo en unos minutos.», que no le decía ni qué
    // campo repitió ni que reintentar no iba a servir de nada.
    await expect(llamar.restriccionBase()).rejects.toMatchObject({
      code: "CONFLICT",
    });

    await llamar.restriccionBase().catch((error: TRPCError) => {
      expect(error.message).toContain("email");
      // Y el mensaje interno de la base no viaja al navegador.
      expect(error.message).not.toContain("Unique constraint failed");
    });
  });

  it("igual lo reporta al monitor: significa que falta un chequeo", async () => {
    // Traducirlo mejora lo que ve el usuario, pero la explicación buena la da
    // el caso de uso ("ya tenés un paciente con ese email: Juan Pérez").
    // Apagar el monitor acá escondería esa deuda.
    await llamar.restriccionBase().catch(() => {});

    expect(capturar).toHaveBeenCalledTimes(1);
  });
});
