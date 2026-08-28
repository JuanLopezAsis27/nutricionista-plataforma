import type {
  PrismaClient,
  ObjetivoComposicion as ObjetivoComposicionFila,
} from "@prisma/client";
import type { IObjetivoComposicionRepositorio } from "@/dominio/repositorios/IObjetivoComposicionRepositorio";
import {
  ObjetivoComposicion,
  type VariableComposicion,
} from "@/dominio/entidades/ObjetivoComposicion";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Implementación con Prisma del repositorio de objetivos de composición.
 * `guardar` es un upsert por (paciente, variable): replantear la meta de una
 * variable pisa la anterior, nunca agrega una segunda.
 */
export class PrismaRepositorioObjetivoComposicion implements IObjetivoComposicionRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async guardar(objetivo: ObjetivoComposicion): Promise<ObjetivoComposicion> {
    const datos = objetivo.aPrimitivos();
    const fila = await this.prisma.objetivoComposicion.upsert({
      where: {
        pacienteId_variable: {
          pacienteId: datos.pacienteId,
          variable: datos.variable,
        },
      },
      create: {
        id: datos.id,
        nutricionistaId: inquilinoActual(),
        pacienteId: datos.pacienteId,
        variable: datos.variable,
        metodoGrasa: datos.metodoGrasa,
        valorObjetivo: datos.valorObjetivo,
        fechaObjetivo: soloFecha(datos.fechaObjetivo),
        estado: datos.estado,
        notas: datos.notas,
      },
      update: {
        metodoGrasa: datos.metodoGrasa,
        valorObjetivo: datos.valorObjetivo,
        fechaObjetivo: soloFecha(datos.fechaObjetivo),
        estado: datos.estado,
        notas: datos.notas,
      },
    });
    return mapear(fila);
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.objetivoComposicion.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<ObjetivoComposicion | null> {
    const fila = await this.prisma.objetivoComposicion.findUnique({
      where: { id },
    });
    return fila ? mapear(fila) : null;
  }

  async obtenerPorVariable(
    pacienteId: string,
    variable: VariableComposicion,
  ): Promise<ObjetivoComposicion | null> {
    const fila = await this.prisma.objetivoComposicion.findUnique({
      where: { pacienteId_variable: { pacienteId, variable } },
    });
    return fila ? mapear(fila) : null;
  }

  async listarPorPaciente(pacienteId: string): Promise<ObjetivoComposicion[]> {
    const filas = await this.prisma.objetivoComposicion.findMany({
      where: { pacienteId },
      orderBy: { creadoEn: "asc" },
    });
    return filas.map(mapear);
  }
}

function mapear(fila: ObjetivoComposicionFila): ObjetivoComposicion {
  return ObjetivoComposicion.reconstruir({
    id: fila.id,
    pacienteId: fila.pacienteId,
    variable: fila.variable,
    metodoGrasa: fila.metodoGrasa,
    valorObjetivo: Number(fila.valorObjetivo),
    fechaObjetivo: fila.fechaObjetivo,
    estado: fila.estado,
    notas: fila.notas,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}

/** Normaliza a medianoche UTC: la fecha objetivo es un día, no un instante. */
function soloFecha(fecha: Date | null): Date | null {
  if (fecha == null) return null;
  return new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
  );
}
