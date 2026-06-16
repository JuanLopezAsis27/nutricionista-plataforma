import { PrismaClient } from "@prisma/client";

/**
 * Singleton del cliente de Prisma.
 *
 * En desarrollo, Next.js recarga los módulos en caliente y crearía múltiples
 * instancias de PrismaClient (agotando el pool de conexiones). Por eso se
 * cachea la instancia en el objeto global. Este archivo es el ÚNICO lugar,
 * junto a los repositorios, donde se importa Prisma.
 */
const globalParaPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export class PrismaClienteSingleton {
  private static instancia: PrismaClient | undefined;

  private constructor() {}

  static obtenerInstancia(): PrismaClient {
    if (!PrismaClienteSingleton.instancia) {
      PrismaClienteSingleton.instancia =
        globalParaPrisma.prisma ??
        new PrismaClient({
          log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
        });

      if (process.env.NODE_ENV !== "production") {
        globalParaPrisma.prisma = PrismaClienteSingleton.instancia;
      }
    }
    return PrismaClienteSingleton.instancia;
  }
}
