import type { PrismaClient } from "@prisma/client";
import type { IPromptIARepositorio } from "@/dominio/repositorios/IPromptIARepositorio";
import type { ClavePromptIA } from "@/dominio/servicios/promptsIA";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * System prompts propios del consultorio.
 *
 * La tabla tiene a lo sumo una fila por funcionalidad personalizada (siete en
 * total), así que `obtenerTodos` trae todo de una: no hay nada que paginar y
 * evita una consulta por cada llamada al modelo.
 */
export class PrismaRepositorioPromptIA implements IPromptIARepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async obtenerTodos(): Promise<Partial<Record<ClavePromptIA, string>>> {
    const filas = await this.prisma.promptIA.findMany();
    const propios: Partial<Record<ClavePromptIA, string>> = {};
    for (const fila of filas) {
      propios[fila.clave as ClavePromptIA] = fila.texto;
    }
    return propios;
  }

  async guardar(clave: ClavePromptIA, texto: string): Promise<void> {
    const inquilino = inquilinoActual();
    await this.prisma.promptIA.upsert({
      where: { nutricionistaId_clave: { nutricionistaId: inquilino, clave } },
      create: { nutricionistaId: inquilino, clave, texto },
      update: { texto },
    });
  }

  async restablecer(clave: ClavePromptIA): Promise<void> {
    const inquilino = inquilinoActual();
    // `deleteMany` y no `delete`: restablecer algo que nunca se personalizó es
    // una operación válida (el texto de fábrica ya era el que se usaba), no un
    // "no existe la fila".
    await this.prisma.promptIA.deleteMany({
      where: { nutricionistaId: inquilino, clave },
    });
  }
}
