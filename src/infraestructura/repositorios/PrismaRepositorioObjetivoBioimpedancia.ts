import type {
  PrismaClient,
  ObjetivoBioimpedancia as ObjetivoBioimpedanciaFila,
} from "@prisma/client";
import type { IObjetivoBioimpedanciaRepositorio } from "@/dominio/repositorios/IObjetivoBioimpedanciaRepositorio";
import {
  ObjetivoBioimpedancia,
  type VariableBioimpedancia,
} from "@/dominio/entidades/ObjetivoBioimpedancia";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";
import { soloFechaOpcional } from "./base/fechas";

/**
 * Implementación con Prisma del repositorio de metas de bioimpedancia.
 *
 * `guardar` es un upsert POR ID: quién decide si una meta se replantea o se
 * crea es el caso de uso, que primero la busca por (paciente, variable). La
 * unicidad la sostiene igual el índice único de la migración 72.
 */
export class PrismaRepositorioObjetivoBioimpedancia
  extends RepositorioPrismaBase<
    ObjetivoBioimpedanciaFila,
    ObjetivoBioimpedancia
  >
  implements IObjetivoBioimpedanciaRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.objetivoBioimpedancia);
  }

  async guardar(
    objetivo: ObjetivoBioimpedancia,
  ): Promise<ObjetivoBioimpedancia> {
    const datos = objetivo.aPrimitivos();
    const fila = await this.prisma.objetivoBioimpedancia.upsert({
      where: { id: datos.id },
      create: {
        id: datos.id,
        nutricionistaId: inquilinoActual(),
        pacienteId: datos.pacienteId,
        variable: datos.variable,
        valorObjetivo: datos.valorObjetivo,
        fechaObjetivo: soloFechaOpcional(datos.fechaObjetivo),
        estado: datos.estado,
        notas: datos.notas,
      },
      update: {
        valorObjetivo: datos.valorObjetivo,
        fechaObjetivo: soloFechaOpcional(datos.fechaObjetivo),
        estado: datos.estado,
        notas: datos.notas,
      },
    });
    return mapearObjetivoBioimpedancia(fila);
  }

  async obtenerPorVariable(
    pacienteId: string,
    variable: VariableBioimpedancia,
  ): Promise<ObjetivoBioimpedancia | null> {
    const fila = await this.prisma.objetivoBioimpedancia.findFirst({
      where: { pacienteId, variable },
    });
    return fila ? mapearObjetivoBioimpedancia(fila) : null;
  }

  async listarPorPaciente(
    pacienteId: string,
  ): Promise<ObjetivoBioimpedancia[]> {
    const filas = await this.prisma.objetivoBioimpedancia.findMany({
      where: { pacienteId },
      orderBy: { creadoEn: "asc" },
    });
    return this.mapearTodas(filas);
  }

  protected override mapear(
    fila: ObjetivoBioimpedanciaFila,
  ): ObjetivoBioimpedancia {
    return mapearObjetivoBioimpedancia(fila);
  }
}

export function mapearObjetivoBioimpedancia(
  fila: ObjetivoBioimpedanciaFila,
): ObjetivoBioimpedancia {
  return ObjetivoBioimpedancia.reconstruir({
    id: fila.id,
    pacienteId: fila.pacienteId,
    variable: fila.variable,
    valorObjetivo: Number(fila.valorObjetivo),
    fechaObjetivo: fila.fechaObjetivo,
    estado: fila.estado,
    notas: fila.notas,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
