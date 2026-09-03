import type {
  PrismaClient,
  Prisma,
  AnalisisComida as AnalisisFila,
} from "@prisma/client";
import type { IHistorialIARepositorio } from "@/dominio/repositorios/IHistorialIARepositorio";
import type { ResultadoAnalisisComida } from "@/dominio/servicios/IAnalisisComidaIA";
import { AnalisisComida } from "@/dominio/entidades/AnalisisComida";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/** Implementación con Prisma del historial de IA (análisis de comida). */
export class PrismaRepositorioHistorialIA implements IHistorialIARepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async guardarAnalisis(analisis: AnalisisComida): Promise<void> {
    const d = analisis.aPrimitivos();
    await this.prisma.analisisComida.create({
      data: {
        nutricionistaId: inquilinoActual(),
        id: d.id,
        pacienteId: d.pacienteId,
        archivoId: d.archivoId,
        resultado: d.resultado as unknown as Prisma.InputJsonValue,
        creadoEn: d.creadoEn,
      },
    });
  }

  async listarAnalisis(
    pacienteId: string,
    limite = 30,
  ): Promise<AnalisisComida[]> {
    const filas = await this.prisma.analisisComida.findMany({
      where: { pacienteId },
      orderBy: { creadoEn: "desc" },
      take: limite,
    });
    return filas.map((f) => mapearAnalisisComida(f));
  }
}

export function mapearAnalisisComida(fila: AnalisisFila): AnalisisComida {
  return AnalisisComida.reconstruir({
    id: fila.id,
    pacienteId: fila.pacienteId,
    archivoId: fila.archivoId,
    resultado: fila.resultado as unknown as ResultadoAnalisisComida,
    creadoEn: fila.creadoEn,
  });
}
