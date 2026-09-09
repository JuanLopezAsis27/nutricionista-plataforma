import { PrismaClienteSingleton } from "@/infraestructura/repositorios/PrismaClienteSingleton";

/**
 * GET /api/salud — sonda de salud del proceso.
 *
 * La usan el `healthcheck` de Docker y el chequeo de upstream de nginx. Hasta
 * ahora no existía ninguna: `restart: unless-stopped` solo reacciona si el
 * proceso MUERE, así que una app viva pero incapaz de hablar con la base
 * (pool agotado, Postgres caído) se quedaba así indefinidamente.
 *
 * Por eso la sonda no se limita a responder 200: verifica de verdad el camino
 * a Postgres, que es de lo que depende todo lo demás (datos, cola y bus de
 * eventos comparten la misma base).
 *
 * Es pública a propósito —quien orquesta no tiene sesión— así que nunca
 * devuelve detalles del error: solo si el servicio sirve o no. Se importa el
 * cliente de Prisma directamente y no el contenedor de DI, para no instanciar
 * los 27 servicios y los adaptadores externos en cada sondeo.
 */
export const runtime = "nodejs";

// Nunca cachear: una sonda que responde desde el caché no es una sonda.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const inicio = Date.now();

  try {
    // Consulta cruda deliberada: no toca ninguna tabla de inquilino, así que
    // no necesita alcance y la extensión multi-inquilino no la intercepta.
    await PrismaClienteSingleton.obtenerInstancia().$queryRaw`SELECT 1`;

    return Response.json(
      { estado: "ok", baseDeDatos: "ok", latenciaMs: Date.now() - inicio },
      { status: 200 },
    );
  } catch (error) {
    // Se registra en el servidor, pero no se expone: el detalle de por qué
    // falla la base no es información para un endpoint público.
    console.error("[salud] la base de datos no responde:", error);

    return Response.json(
      {
        estado: "degradado",
        baseDeDatos: "error",
        latenciaMs: Date.now() - inicio,
      },
      { status: 503 },
    );
  }
}
