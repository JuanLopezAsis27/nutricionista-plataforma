import type {
  PrismaClient,
  ObjetivoComposicion as ObjetivoComposicionFila,
} from "@prisma/client";
import type { IObjetivoComposicionRepositorio } from "@/dominio/repositorios/IObjetivoComposicionRepositorio";
import {
  ObjetivoComposicion,
  type VariableComposicion,
} from "@/dominio/entidades/ObjetivoComposicion";
import type { MetodoGrasa } from "@/dominio/servicios/grasaPorPliegues";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Implementación con Prisma del repositorio de objetivos de composición.
 *
 * `guardar` es un upsert POR ID, no por la clave de negocio. Quién decide si
 * una meta se replantea o se crea es el caso de uso, que primero busca la
 * combinación (paciente, variable, ecuación) y reutiliza el id si la
 * encuentra. Acá no se puede hacer por clave de negocio porque `metodoGrasa`
 * es nullable y Prisma no admite null en una clave compuesta única —en
 * Postgres los NULL no colisionan—. La unicidad la sostienen igual los dos
 * índices de la migración 40, que es donde tiene que estar.
 */
export class PrismaRepositorioObjetivoComposicion implements IObjetivoComposicionRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async guardar(objetivo: ObjetivoComposicion): Promise<ObjetivoComposicion> {
    const datos = objetivo.aPrimitivos();
    const fila = await this.prisma.objetivoComposicion.upsert({
      where: { id: datos.id },
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
    return mapearObjetivoComposicion(fila);
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.objetivoComposicion.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<ObjetivoComposicion | null> {
    const fila = await this.prisma.objetivoComposicion.findUnique({
      where: { id },
    });
    return fila ? mapearObjetivoComposicion(fila) : null;
  }

  async obtenerPorVariable(
    pacienteId: string,
    variable: VariableComposicion,
    metodoGrasa: MetodoGrasa | null,
  ): Promise<ObjetivoComposicion | null> {
    // `findFirst` y no `findUnique`: la clave única incluye `metodoGrasa`, y
    // Prisma no admite null en la clave compuesta de un findUnique porque en
    // Postgres los NULL no colisionan entre sí. La unicidad del caso NULL la
    // sostiene el índice parcial de la migración 40; acá alcanza con buscar.
    const fila = await this.prisma.objetivoComposicion.findFirst({
      where: { pacienteId, variable, metodoGrasa },
    });
    return fila ? mapearObjetivoComposicion(fila) : null;
  }

  async listarPorPaciente(pacienteId: string): Promise<ObjetivoComposicion[]> {
    const filas = await this.prisma.objetivoComposicion.findMany({
      where: { pacienteId },
      orderBy: { creadoEn: "asc" },
    });
    return filas.map(mapearObjetivoComposicion);
  }
}

export function mapearObjetivoComposicion(
  fila: ObjetivoComposicionFila,
): ObjetivoComposicion {
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
