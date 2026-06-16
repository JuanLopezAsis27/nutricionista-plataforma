import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { routerApp } from "@/servidor/raiz";
import { crearContexto } from "@/servidor/contexto";

/**
 * Entry point HTTP de tRPC (App Router).
 * Todas las llamadas del cliente entran por /api/trpc/*.
 */
const manejador = (peticion: Request): Promise<Response> =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: peticion,
    router: routerApp,
    createContext: crearContexto,
  });

export { manejador as GET, manejador as POST };
