import type { PrismaClient } from "@prisma/client";
import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";
import { ErrorUsuarioNoEncontrado } from "@/dominio/errores/ErrorUsuarioNoEncontrado";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Implementación con Prisma del registro de inquilinos.
 *
 * `nutricionistas` NO es una tabla de inquilino (es la tabla DE los
 * inquilinos), así que queda fuera de MODELOS_INQUILINO y la extensión no le
 * agrega ningún filtro: se la consulta con alcance global, igual que a
 * `usuarios` durante el login. Por eso "el actual" se resuelve acá, con el
 * alcance en curso, y no lo filtra nadie más.
 */
export class PrismaRepositorioNutricionista implements INutricionistaRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(id: string, nombre: string): Promise<void> {
    await this.prisma.nutricionista.upsert({
      where: { id },
      create: { id, nombre },
      update: {},
    });
  }

  async existe(id: string): Promise<boolean> {
    return (await this.prisma.nutricionista.count({ where: { id } })) > 0;
  }

  async nombreDe(id: string): Promise<string | null> {
    const fila = await this.prisma.nutricionista.findUnique({
      where: { id },
      select: { nombre: true },
    });
    return fila?.nombre ?? null;
  }

  async nombreDelActual(): Promise<string> {
    const id = inquilinoActual();
    const nombre = await this.nombreDe(id);
    if (nombre === null) {
      // No debería pasar: `usuarios.nutricionistaId` es FK a esta tabla, y el
      // id del inquilino es el de la cuenta del profesional.
      throw new ErrorUsuarioNoEncontrado(id);
    }
    return nombre;
  }

  async renombrarActual(nombre: string): Promise<void> {
    await this.prisma.nutricionista.update({
      where: { id: inquilinoActual() },
      data: { nombre },
    });
  }
}
