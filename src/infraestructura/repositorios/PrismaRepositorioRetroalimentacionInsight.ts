import type { PrismaClient } from "@prisma/client";
import type {
  IRetroalimentacionInsightRepositorio,
  DatosRetroalimentacion,
} from "@/dominio/repositorios/IRetroalimentacionInsightRepositorio";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Repositorio Prisma de la retroalimentación de insights. Upsert por
 * (nutricionistaId, pacienteId, tipoInsight): el último voto reemplaza al
 * anterior. La extensión multi-inquilino setea/filtra `nutricionistaId`.
 */
export class PrismaRepositorioRetroalimentacionInsight
  implements IRetroalimentacionInsightRepositorio
{
  constructor(private readonly prisma: PrismaClient) {}

  async registrar(datos: DatosRetroalimentacion): Promise<void> {
    const existente = await this.prisma.retroalimentacionInsight.findFirst({
      where: { pacienteId: datos.pacienteId, tipoInsight: datos.tipoInsight },
    });
    const valores = {
      util: datos.util,
      detalle: datos.detalle,
      comentario: datos.comentario ?? null,
    };
    if (existente) {
      await this.prisma.retroalimentacionInsight.update({
        where: { id: existente.id },
        data: valores,
      });
    } else {
      await this.prisma.retroalimentacionInsight.create({
        data: {
          id: crypto.randomUUID(),
          nutricionistaId: inquilinoActual(),
          pacienteId: datos.pacienteId,
          tipoInsight: datos.tipoInsight,
          ...valores,
        },
      });
    }
  }
}
