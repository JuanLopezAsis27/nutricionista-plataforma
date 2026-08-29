import type {
  PrismaClient,
  PlantillaWhatsapp as PlantillaFila,
} from "@prisma/client";
import type { IPlantillaWhatsappRepositorio } from "@/dominio/repositorios/IPlantillaWhatsappRepositorio";
import {
  PlantillaWhatsapp,
  type VariableRecordatorio,
} from "@/dominio/entidades/PlantillaWhatsapp";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Implementación con Prisma de las plantillas de recordatorio por WhatsApp.
 *
 * No filtra por `nutricionistaId`: eso lo inyecta la extensión multi-inquilino
 * del cliente, igual que en el resto de los repositorios.
 */
export class PrismaRepositorioPlantillaWhatsapp implements IPlantillaWhatsappRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async listar(): Promise<PlantillaWhatsapp[]> {
    const filas = await this.prisma.plantillaWhatsapp.findMany({
      // La predeterminada primero: es la que el profesional busca al entrar.
      orderBy: [{ predeterminada: "desc" }, { nombre: "asc" }],
    });
    return filas.map((fila) => mapearPlantillaWhatsapp(fila));
  }

  async obtenerPorId(id: string): Promise<PlantillaWhatsapp | null> {
    const fila = await this.prisma.plantillaWhatsapp.findUnique({
      where: { id },
    });
    return fila ? mapearPlantillaWhatsapp(fila) : null;
  }

  async obtenerPredeterminada(): Promise<PlantillaWhatsapp | null> {
    const fila = await this.prisma.plantillaWhatsapp.findFirst({
      where: { predeterminada: true, activa: true },
    });
    return fila ? mapearPlantillaWhatsapp(fila) : null;
  }

  async crear(plantilla: PlantillaWhatsapp): Promise<PlantillaWhatsapp> {
    const d = plantilla.aPrimitivos();
    const fila = await this.prisma.plantillaWhatsapp.create({
      data: {
        nutricionistaId: inquilinoActual(),
        id: d.id,
        nombre: d.nombre,
        cuerpo: d.cuerpo,
        claveMeta: d.claveMeta,
        idiomaMeta: d.idiomaMeta,
        variablesMeta: d.variablesMeta,
        predeterminada: d.predeterminada,
        activa: d.activa,
        creadoEn: d.creadoEn,
      },
    });
    return mapearPlantillaWhatsapp(fila);
  }

  async actualizar(plantilla: PlantillaWhatsapp): Promise<PlantillaWhatsapp> {
    const d = plantilla.aPrimitivos();
    const fila = await this.prisma.plantillaWhatsapp.update({
      where: { id: d.id },
      data: {
        nombre: d.nombre,
        cuerpo: d.cuerpo,
        claveMeta: d.claveMeta,
        idiomaMeta: d.idiomaMeta,
        variablesMeta: d.variablesMeta,
        predeterminada: d.predeterminada,
        activa: d.activa,
      },
    });
    return mapearPlantillaWhatsapp(fila);
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.plantillaWhatsapp.delete({ where: { id } });
  }
}

export function mapearPlantillaWhatsapp(
  fila: PlantillaFila,
): PlantillaWhatsapp {
  return PlantillaWhatsapp.reconstruir({
    id: fila.id,
    nombre: fila.nombre,
    cuerpo: fila.cuerpo,
    claveMeta: fila.claveMeta,
    idiomaMeta: fila.idiomaMeta,
    variablesMeta: fila.variablesMeta as VariableRecordatorio[],
    predeterminada: fila.predeterminada,
    activa: fila.activa,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
