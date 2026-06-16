import type {
  PrismaClient,
  Prisma,
  AsignacionDieta as AsignacionFila,
} from "@prisma/client";
import type {
  IDietaRepositorio,
  AsignacionDieta,
} from "@/dominio/repositorios/IDietaRepositorio";
import { Dieta, type TipoComida } from "@/dominio/entidades/Dieta";

/** Tipo de fila de dieta con sus comidas incluidas. */
type DietaConComidas = Prisma.DietaGetPayload<{ include: { comidas: true } }>;

/**
 * Implementación con Prisma del repositorio de Dieta.
 * Incluye siempre las comidas en las consultas y maneja las asignaciones
 * dieta⇄paciente. Mapea con mapearADieta().
 */
export class PrismaRepositorioDieta implements IDietaRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(dieta: Dieta): Promise<Dieta> {
    const datos = dieta.aPrimitivos();
    const fila = await this.prisma.dieta.create({
      data: {
        id: datos.id,
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        creadoEn: datos.creadoEn,
        comidas: {
          create: datos.comidas.map((comida) => ({
            id: comida.id,
            tipo: comida.tipo,
            descripcion: comida.descripcion,
            calorias: comida.calorias,
          })),
        },
      },
      include: { comidas: true },
    });
    return this.mapearADieta(fila);
  }

  async actualizar(dieta: Dieta): Promise<Dieta> {
    const datos = dieta.aPrimitivos();
    // Reemplaza el conjunto de comidas: borra las viejas y crea las nuevas.
    const [, fila] = await this.prisma.$transaction([
      this.prisma.comida.deleteMany({ where: { dietaId: datos.id } }),
      this.prisma.dieta.update({
        where: { id: datos.id },
        data: {
          nombre: datos.nombre,
          descripcion: datos.descripcion,
          comidas: {
            create: datos.comidas.map((comida) => ({
              id: comida.id,
              tipo: comida.tipo,
              descripcion: comida.descripcion,
              calorias: comida.calorias,
            })),
          },
        },
        include: { comidas: true },
      }),
    ]);
    return this.mapearADieta(fila);
  }

  async eliminar(id: string): Promise<void> {
    // Las comidas y asignaciones se borran en cascada (ver schema.prisma).
    await this.prisma.dieta.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<Dieta | null> {
    const fila = await this.prisma.dieta.findUnique({
      where: { id },
      include: { comidas: true },
    });
    return fila ? this.mapearADieta(fila) : null;
  }

  async listar(): Promise<Dieta[]> {
    const filas = await this.prisma.dieta.findMany({
      include: { comidas: true },
      orderBy: { creadoEn: "desc" },
    });
    return filas.map((fila) => this.mapearADieta(fila));
  }

  async contarAsignacionesActivasDeDieta(dietaId: string): Promise<number> {
    return this.prisma.asignacionDieta.count({ where: { dietaId, activa: true } });
  }

  async asignarAPaciente(asignacion: AsignacionDieta): Promise<AsignacionDieta> {
    const fila = await this.prisma.asignacionDieta.create({
      data: {
        id: asignacion.id,
        dietaId: asignacion.dietaId,
        pacienteId: asignacion.pacienteId,
        fechaInicio: this.soloFecha(asignacion.fechaInicio),
        fechaFin: asignacion.fechaFin ? this.soloFecha(asignacion.fechaFin) : null,
        activa: asignacion.activa,
      },
    });
    return this.mapearAAsignacion(fila);
  }

  async desactivarAsignacionesDe(pacienteId: string): Promise<void> {
    await this.prisma.asignacionDieta.updateMany({
      where: { pacienteId, activa: true },
      data: { activa: false },
    });
  }

  async obtenerAsignacionActiva(pacienteId: string): Promise<AsignacionDieta | null> {
    const fila = await this.prisma.asignacionDieta.findFirst({
      where: { pacienteId, activa: true },
    });
    return fila ? this.mapearAAsignacion(fila) : null;
  }

  async obtenerDietaActivaDePaciente(pacienteId: string): Promise<Dieta | null> {
    const asignacion = await this.prisma.asignacionDieta.findFirst({
      where: { pacienteId, activa: true },
      include: { dieta: { include: { comidas: true } } },
    });
    return asignacion ? this.mapearADieta(asignacion.dieta) : null;
  }

  private soloFecha(fecha: Date): Date {
    return new Date(
      Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
    );
  }

  /** Mapea una fila de dieta (con comidas) a la entidad de dominio Dieta. */
  private mapearADieta(fila: DietaConComidas): Dieta {
    return Dieta.reconstruir({
      id: fila.id,
      nombre: fila.nombre,
      descripcion: fila.descripcion,
      comidas: fila.comidas.map((comida) => ({
        id: comida.id,
        tipo: comida.tipo as TipoComida,
        descripcion: comida.descripcion,
        calorias: comida.calorias,
      })),
      creadoEn: fila.creadoEn,
    });
  }

  /** Mapea una fila de asignación al tipo de dominio AsignacionDieta. */
  private mapearAAsignacion(fila: AsignacionFila): AsignacionDieta {
    return {
      id: fila.id,
      dietaId: fila.dietaId,
      pacienteId: fila.pacienteId,
      fechaInicio: fila.fechaInicio,
      fechaFin: fila.fechaFin,
      activa: fila.activa,
    };
  }
}
