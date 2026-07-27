import { auth } from "@/lib/autenticacion/auth";
import {
  ejecutarEnNutricionista,
  ejecutarGlobal,
} from "@/infraestructura/multitenancy/contextoTenant";

/**
 * Ejecuta `fn` dentro del alcance de inquilino de la sesión actual.
 *
 * Es la pieza que conecta la sesión HTTP con el aislamiento multi-inquilino:
 * resuelve la sesión y corre `fn` dentro de `ejecutarEnNutricionista`/`ejecutarGlobal`
 * (un `AsyncLocalStorage.run`, que SÍ propaga el alcance a todo el árbol async
 * de la request — a diferencia de `enterWith`, que no llega al resolver de tRPC).
 *
 * La deben usar TODOS los entry points HTTP que consultan tablas de inquilino
 * (route handler de tRPC, /api/archivos, /api/planes/[id]/pdf, …); si no, la
 * extensión de Prisma falla cerrado y no devuelve datos.
 */
export async function conAlcanceDeSesion<T>(fn: () => Promise<T>): Promise<T> {
  const usuario = (await auth())?.user;

  if (usuario?.rol === "SUPERADMIN") {
    return ejecutarGlobal(fn);
  }
  if (usuario?.nutricionistaId) {
    return ejecutarEnNutricionista(usuario.nutricionistaId, fn);
  }
  // Sin sesión (o sin inquilino): no se fija alcance. Los procedimientos
  // públicos no tocan tablas de inquilino; si lo hicieran, la extensión falla
  // cerrado (correcto: nadie sin inquilino debe leer datos de inquilino).
  return fn();
}
