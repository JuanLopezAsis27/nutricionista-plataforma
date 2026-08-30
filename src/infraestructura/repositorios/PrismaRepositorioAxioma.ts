import type {
  PrismaClient,
  AxiomaNutricional as AxiomaFila,
} from "@prisma/client";
import type { IAxiomaRepositorio } from "@/dominio/repositorios/IAxiomaRepositorio";
import { AxiomaNutricional } from "@/dominio/entidades/AxiomaNutricional";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";

/** Implementación con Prisma del repositorio de axiomas (base de conocimiento). */
export class PrismaRepositorioAxioma
  extends RepositorioPrismaBase<AxiomaFila, AxiomaNutricional>
  implements IAxiomaRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.axiomaNutricional);
  }

  async crear(axioma: AxiomaNutricional): Promise<AxiomaNutricional> {
    const d = axioma.aPrimitivos();
    const fila = await this.prisma.axiomaNutricional.create({
      data: {
        id: d.id,
        nutricionistaId: inquilinoActual(),
        ambito: d.ambito,
        parametro: d.parametro,
        operador: d.operador,
        valor: d.valor,
        valorMax: d.valorMax,
        unidad: d.unidad,
        texto: d.texto,
        prioridad: d.prioridad,
        activo: d.activo,
        creadoEn: d.creadoEn,
      },
    });
    return mapearAxioma(fila);
  }

  async actualizar(axioma: AxiomaNutricional): Promise<AxiomaNutricional> {
    const d = axioma.aPrimitivos();
    const fila = await this.prisma.axiomaNutricional.update({
      where: { id: d.id },
      data: {
        ambito: d.ambito,
        parametro: d.parametro,
        operador: d.operador,
        valor: d.valor,
        valorMax: d.valorMax,
        unidad: d.unidad,
        texto: d.texto,
        prioridad: d.prioridad,
        activo: d.activo,
      },
    });
    return mapearAxioma(fila);
  }

  async listar(): Promise<AxiomaNutricional[]> {
    const filas = await this.prisma.axiomaNutricional.findMany({
      orderBy: [{ prioridad: "desc" }, { creadoEn: "asc" }],
    });
    return this.mapearTodas(filas);
  }

  async listarActivos(): Promise<AxiomaNutricional[]> {
    const filas = await this.prisma.axiomaNutricional.findMany({
      where: { activo: true },
      orderBy: [{ prioridad: "desc" }, { creadoEn: "asc" }],
    });
    return this.mapearTodas(filas);
  }

  protected override mapear(fila: AxiomaFila): AxiomaNutricional {
    return mapearAxioma(fila);
  }
}

export function mapearAxioma(fila: AxiomaFila): AxiomaNutricional {
  return AxiomaNutricional.reconstruir({
    id: fila.id,
    ambito: fila.ambito,
    parametro: fila.parametro,
    operador: fila.operador,
    valor: fila.valor,
    valorMax: fila.valorMax,
    unidad: fila.unidad,
    texto: fila.texto,
    prioridad: fila.prioridad,
    activo: fila.activo,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
