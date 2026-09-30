import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { z } from "zod";

const capturar = vi.fn();
vi.mock("@/infraestructura/monitoreo/monitor", () => ({
  monitorErrores: { capturar: (...args: unknown[]) => capturar(...args) },
}));

/** Doblado por el mismo motivo que en `trpc.test.ts`: el real importa Prisma. */
vi.mock("@/infraestructura/persistencia/erroresPrisma", () => ({
  traducirErrorPrisma: (error: unknown) =>
    error instanceof Error && error.message.includes("Unique constraint")
      ? {
          codigo: "CONFLICTO",
          message: "Ya existe un registro con ese email. Revisá los datos.",
        }
      : null,
}));

import { aRespuestaError } from "./errores-http";
import { MAPA_CODIGOS_TRPC, MAPA_ESTADOS_HTTP } from "./mapaCodigos";
import type { CodigoErrorDominio } from "@/dominio/errores/ErrorDominio";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/**
 * El borde de errores de los route handlers de `/api/*`, que no pasan por el
 * middleware de tRPC y tienen que decir LO MISMO que él. El lado de tRPC lo
 * cubre `trpc.test.ts`; este cubre el otro y la paridad entre los dos mapas.
 */

async function cuerpo(respuesta: Response): Promise<{ error: string }> {
  return (await respuesta.json()) as { error: string };
}

beforeEach(() => capturar.mockClear());

describe("aRespuestaError", () => {
  it.each([
    [new ErrorValidacion("El peso debe estar entre 20 y 400 kg."), 400],
    [new ErrorPacienteNoEncontrado("pac-1"), 404],
    [new ErrorAccesoDenegado("No tenés acceso a este archivo."), 403],
  ])(
    "un error de dominio sale con su status y su mensaje, sin ir al monitor",
    async (error, status) => {
      const respuesta = aRespuestaError(error);

      expect(respuesta.status).toBe(status);
      expect((await cuerpo(respuesta)).error).toBe(error.message);
      expect(capturar).not.toHaveBeenCalled();
    },
  );

  it("un ZodError sale como 400 en castellano, nunca como el JSON de los issues", async () => {
    const resultado = z.object({ peso: z.number() }).safeParse({ peso: "x" });
    if (resultado.success) throw new Error("debía fallar");

    const respuesta = aRespuestaError(resultado.error);

    expect(respuesta.status).toBe(400);
    const { error } = await cuerpo(respuesta);
    expect(error).not.toMatch(/"code"|invalid_type|\[/);
    expect(capturar).not.toHaveBeenCalled();
  });

  it("un choque con la base se traduce Y se reporta al monitor", async () => {
    const error = new Error(
      "Unique constraint failed on the fields: (`email`)",
    );

    const respuesta = aRespuestaError(error);

    expect(respuesta.status).toBe(409);
    expect((await cuerpo(respuesta)).error).toMatch(/Ya existe un registro/);
    // Llegar a la base es la señal de que falta el chequeo en el caso de uso.
    expect(capturar).toHaveBeenCalledOnce();
  });

  it("un error inesperado sale como 500 genérico, sin filtrar el mensaje interno", async () => {
    const error = new Error("connect ECONNREFUSED 10.0.0.5:5432");

    const respuesta = aRespuestaError(error);

    expect(respuesta.status).toBe(500);
    const { error: mensaje } = await cuerpo(respuesta);
    expect(mensaje).not.toContain("ECONNREFUSED");
    expect(capturar).toHaveBeenCalledWith(error, { origen: "route-handler" });
  });
});

describe("paridad entre los dos bordes", () => {
  it.each(Object.keys(MAPA_ESTADOS_HTTP) as CodigoErrorDominio[])(
    "%s da el mismo status HTTP por tRPC que por un route handler",
    (codigo) => {
      const porTrpc = getHTTPStatusCodeFromError(
        new TRPCError({ code: MAPA_CODIGOS_TRPC[codigo] }),
      );
      expect(porTrpc).toBe(MAPA_ESTADOS_HTTP[codigo]);
    },
  );
});
