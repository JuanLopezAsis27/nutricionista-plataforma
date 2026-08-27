import type { PrismaClient, PlantillaEmail as PlantillaFila } from "@prisma/client";
import type { IPlantillaEmailRepositorio } from "@/dominio/repositorios/IPlantillaEmailRepositorio";
import { PlantillaEmail } from "@/dominio/entidades/PlantillaEmail";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/** Implementación con Prisma del repositorio de plantillas de email. */
export class PrismaRepositorioPlantillaEmail implements IPlantillaEmailRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(plantilla: PlantillaEmail): Promise<PlantillaEmail> {
    const d = plantilla.aPrimitivos();
    const fila = await this.prisma.plantillaEmail.create({
      data: {
        id: d.id,
        nutricionistaId: inquilinoActual(),
        clave: d.clave,
        nombre: d.nombre,
        asunto: d.asunto,
        cuerpoHtml: d.cuerpoHtml,
        descripcion: d.descripcion,
        deSistema: d.deSistema,
        creadoEn: d.creadoEn,
        actualizadoEn: d.actualizadoEn,
      },
    });
    return this.mapear(fila);
  }

  async actualizar(plantilla: PlantillaEmail): Promise<PlantillaEmail> {
    const d = plantilla.aPrimitivos();
    const fila = await this.prisma.plantillaEmail.update({
      where: { id: d.id },
      data: {
        nombre: d.nombre,
        asunto: d.asunto,
        cuerpoHtml: d.cuerpoHtml,
        descripcion: d.descripcion,
        actualizadoEn: d.actualizadoEn,
      },
    });
    return this.mapear(fila);
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.plantillaEmail.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<PlantillaEmail | null> {
    const fila = await this.prisma.plantillaEmail.findUnique({ where: { id } });
    return fila ? this.mapear(fila) : null;
  }

  async obtenerPorClave(clave: string): Promise<PlantillaEmail | null> {
    // `clave` es única POR nutricionista (@@unique([nutricionistaId, clave])); la
    // extensión multi-inquilino acota el findFirst al nutricionista de la request.
    const fila = await this.prisma.plantillaEmail.findFirst({ where: { clave } });
    return fila ? this.mapear(fila) : null;
  }

  async listar(): Promise<PlantillaEmail[]> {
    const filas = await this.prisma.plantillaEmail.findMany({ orderBy: { nombre: "asc" } });
    return filas.map((fila) => this.mapear(fila));
  }

  private mapear(fila: PlantillaFila): PlantillaEmail {
    return PlantillaEmail.reconstruir({
      id: fila.id,
      clave: fila.clave,
      nombre: fila.nombre,
      asunto: fila.asunto,
      cuerpoHtml: fila.cuerpoHtml,
      descripcion: fila.descripcion,
      deSistema: fila.deSistema,
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  }
}
