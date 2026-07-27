import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { routerApp } from "@/servidor/raiz";
import { crearContexto } from "@/servidor/contexto";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

/**
 * Entry point HTTP de tRPC (App Router).
 * Todas las llamadas del cliente entran por /api/trpc/*.
 *
 * Se envuelve en `conAlcanceDeSesion` para que TODA la ejecución (contexto +
 * resolvers) corra dentro del alcance de inquilino de la sesión (aislamiento
 * multi-inquilino, fail-closed).
 */
const manejador = (peticion: Request): Promise<Response> =>
  conAlcanceDeSesion(() =>
    fetchRequestHandler({
      endpoint: "/api/trpc",
      req: peticion,
      router: routerApp,
      createContext: crearContexto,
    }),
  );

export { manejador as GET, manejador as POST };
