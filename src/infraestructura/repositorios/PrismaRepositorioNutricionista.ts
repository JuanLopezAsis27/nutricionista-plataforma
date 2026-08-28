import type { PrismaClient } from "@prisma/client";
import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";

/**
 * Implementación con Prisma del registro de inquilinos.
 *
 * `nutricionistas` NO es una tabla de inquilino (es la tabla DE los
 * inquilinos), así que queda fuera de MODELOS_INQUILINO y la extensión no le
 * agrega ningún filtro: se la consulta con alcance global, igual que a
 * `usuarios` durante el login.
 */
export class PrismaRepositorioNutricionista implements INutricionistaRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(id: string): Promise<void> {
    await this.prisma.nutricionista.upsert({
      where: { id },
      create: { id },
      update: {},
    });
  }

  async existe(id: string): Promise<boolean> {
    return (await this.prisma.nutricionista.count({ where: { id } })) > 0;
  }
}
