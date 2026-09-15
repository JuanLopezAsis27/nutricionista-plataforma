import type {
  PrismaClient,
  PlantillaEmailRecordatorio as PlantillaFila,
} from "@prisma/client";
import type { IPlantillaEmailRecordatorioRepositorio } from "@/dominio/repositorios/IPlantillaEmailRecordatorioRepositorio";
import { PlantillaEmailRecordatorio } from "@/dominio/entidades/PlantillaEmailRecordatorio";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";

/**
 * Implementación con Prisma de las plantillas de recordatorio por email.
 *
 * No filtra por `nutricionistaId`: eso lo inyecta la extensión multi-inquilino
 * del cliente, igual que en el resto de los repositorios.
 */
export class PrismaRepositorioPlantillaEmailRecordatorio
  extends RepositorioPrismaBase<PlantillaFila, PlantillaEmailRecordatorio>
  implements IPlantillaEmailRecordatorioRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.plantillaEmailRecordatorio);
  }

  async listar(): Promise<PlantillaEmailRecordatorio[]> {
    const filas = await this.prisma.plantillaEmailRecordatorio.findMany({
      // La predeterminada primero: es la que el profesional busca al entrar.
      orderBy: [{ predeterminada: "desc" }, { nombre: "asc" }],
    });
    return this.mapearTodas(filas);
  }

  async obtenerPredeterminada(): Promise<PlantillaEmailRecordatorio | null> {
    const fila = await this.prisma.plantillaEmailRecordatorio.findFirst({
      where: { predeterminada: true, activa: true },
    });
    return fila ? mapearPlantillaEmailRecordatorio(fila) : null;
  }

  async obtenerPorDia(
    diasAntes: number,
  ): Promise<PlantillaEmailRecordatorio | null> {
    const fila = await this.prisma.plantillaEmailRecordatorio.findFirst({
      where: { diasAntes, activa: true },
    });
    return fila ? mapearPlantillaEmailRecordatorio(fila) : null;
  }

  async crear(
    plantilla: PlantillaEmailRecordatorio,
  ): Promise<PlantillaEmailRecordatorio> {
    const d = plantilla.aPrimitivos();
    const fila = await this.prisma.plantillaEmailRecordatorio.create({
      data: {
        nutricionistaId: inquilinoActual(),
        id: d.id,
        nombre: d.nombre,
        asunto: d.asunto,
        cuerpoHtml: d.cuerpoHtml,
        diasAntes: d.diasAntes,
        predeterminada: d.predeterminada,
        activa: d.activa,
        incluirBotonConfirmacion: d.incluirBotonConfirmacion,
        creadoEn: d.creadoEn,
      },
    });
    return mapearPlantillaEmailRecordatorio(fila);
  }

  async actualizar(
    plantilla: PlantillaEmailRecordatorio,
  ): Promise<PlantillaEmailRecordatorio> {
    const d = plantilla.aPrimitivos();
    const fila = await this.prisma.plantillaEmailRecordatorio.update({
      where: { id: d.id },
      data: {
        nombre: d.nombre,
        asunto: d.asunto,
        cuerpoHtml: d.cuerpoHtml,
        diasAntes: d.diasAntes,
        predeterminada: d.predeterminada,
        activa: d.activa,
        incluirBotonConfirmacion: d.incluirBotonConfirmacion,
      },
    });
    return mapearPlantillaEmailRecordatorio(fila);
  }

  protected override mapear(fila: PlantillaFila): PlantillaEmailRecordatorio {
    return mapearPlantillaEmailRecordatorio(fila);
  }
}

export function mapearPlantillaEmailRecordatorio(
  fila: PlantillaFila,
): PlantillaEmailRecordatorio {
  return PlantillaEmailRecordatorio.reconstruir({
    id: fila.id,
    nombre: fila.nombre,
    asunto: fila.asunto,
    cuerpoHtml: fila.cuerpoHtml,
    diasAntes: fila.diasAntes,
    predeterminada: fila.predeterminada,
    activa: fila.activa,
    incluirBotonConfirmacion: fila.incluirBotonConfirmacion,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
