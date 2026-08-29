import type {
  PrismaClient,
  AxiomaNutricional as AxiomaFila,
} from "@prisma/client";
import type { IAxiomaRepositorio } from "@/dominio/repositorios/IAxiomaRepositorio";
import { AxiomaNutricional } from "@/dominio/entidades/AxiomaNutricional";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/** Implementación con Prisma del repositorio de axiomas (base de conocimiento). */
export class PrismaRepositorioAxioma implements IAxiomaRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

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
    return this.mapear(fila);
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
    return this.mapear(fila);
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.axiomaNutricional.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<AxiomaNutricional | null> {
    const fila = await this.prisma.axiomaNutricional.findUnique({
      where: { id },
    });
    return fila ? this.mapear(fila) : null;
  }

  async listar(): Promise<AxiomaNutricional[]> {
    const filas = await this.prisma.axiomaNutricional.findMany({
      orderBy: [{ prioridad: "desc" }, { creadoEn: "asc" }],
    });
    return filas.map((fila) => this.mapear(fila));
  }

  async listarActivos(): Promise<AxiomaNutricional[]> {
    const filas = await this.prisma.axiomaNutricional.findMany({
      where: { activo: true },
      orderBy: [{ prioridad: "desc" }, { creadoEn: "asc" }],
    });
    return filas.map((fila) => this.mapear(fila));
  }

  private mapear(fila: AxiomaFila): AxiomaNutricional {
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
}
