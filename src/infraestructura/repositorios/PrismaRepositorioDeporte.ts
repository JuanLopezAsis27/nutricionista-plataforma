import type { PrismaClient, Deporte as DeporteFila } from "@prisma/client";
import type { IDeporteRepositorio } from "@/dominio/repositorios/IDeporteRepositorio";
import { Deporte } from "@/dominio/entidades/Deporte";

/**
 * La lista de deportes de la plataforma (migración 97): sin inquilino, como
 * `categorias_alimento_base`. La lee todo consultorio; la escribe solo el
 * SUPERADMIN.
 */
export class PrismaRepositorioDeporte implements IDeporteRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(deporte: Deporte): Promise<Deporte> {
    const fila = await this.prisma.deporte.create({
      data: {
        id: deporte.id,
        nombre: deporte.nombre,
        claveNombre: deporte.claveNombre,
        formatoPlanificacion: deporte.formatoPlanificacion,
      },
    });
    return mapearDeporte(fila);
  }

  async actualizar(deporte: Deporte): Promise<Deporte> {
    const fila = await this.prisma.deporte.update({
      where: { id: deporte.id },
      data: {
        nombre: deporte.nombre,
        claveNombre: deporte.claveNombre,
        formatoPlanificacion: deporte.formatoPlanificacion,
      },
    });
    return mapearDeporte(fila);
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.deporte.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<Deporte | null> {
    const fila = await this.prisma.deporte.findUnique({ where: { id } });
    return fila ? mapearDeporte(fila) : null;
  }

  async listar(): Promise<Deporte[]> {
    const filas = await this.prisma.deporte.findMany({
      orderBy: { nombre: "asc" },
    });
    return filas.map(mapearDeporte);
  }

  async existeNombre(
    claveNombre: string,
    excluirId?: string,
  ): Promise<boolean> {
    const cantidad = await this.prisma.deporte.count({
      where: {
        claveNombre,
        ...(excluirId ? { NOT: { id: excluirId } } : {}),
      },
    });
    return cantidad > 0;
  }
}

function mapearDeporte(fila: DeporteFila): Deporte {
  return Deporte.reconstruir({
    id: fila.id,
    nombre: fila.nombre,
    formatoPlanificacion: fila.formatoPlanificacion,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
