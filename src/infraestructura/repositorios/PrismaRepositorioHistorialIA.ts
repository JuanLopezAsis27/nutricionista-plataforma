import type {
  PrismaClient,
  Prisma,
  ConsultaIA as ConsultaFila,
  AnalisisComida as AnalisisFila,
} from "@prisma/client";
import type { IHistorialIARepositorio } from "@/dominio/repositorios/IHistorialIARepositorio";
import type { ResultadoAnalisisComida } from "@/dominio/servicios/IAnalisisComidaIA";
import { ConsultaIA } from "@/dominio/entidades/ConsultaIA";
import { AnalisisComida } from "@/dominio/entidades/AnalisisComida";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/** Implementación con Prisma del historial de IA (consultas + análisis). */
export class PrismaRepositorioHistorialIA implements IHistorialIARepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async guardarConsulta(consulta: ConsultaIA): Promise<void> {
    const d = consulta.aPrimitivos();
    await this.prisma.consultaIA.create({
      data: {
        nutricionistaId: inquilinoActual(),
        id: d.id,
        pacienteId: d.pacienteId,
        pregunta: d.pregunta,
        respuesta: d.respuesta,
        creadoEn: d.creadoEn,
      },
    });
  }

  async listarConsultas(
    pacienteId: string,
    limite = 30,
  ): Promise<ConsultaIA[]> {
    const filas = await this.prisma.consultaIA.findMany({
      where: { pacienteId },
      orderBy: { creadoEn: "desc" },
      take: limite,
    });
    return filas.reverse().map((f) => mapearConsultaIA(f));
  }

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

export function mapearConsultaIA(fila: ConsultaFila): ConsultaIA {
  return ConsultaIA.reconstruir({
    id: fila.id,
    pacienteId: fila.pacienteId,
    pregunta: fila.pregunta,
    respuesta: fila.respuesta,
    creadoEn: fila.creadoEn,
  });
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
