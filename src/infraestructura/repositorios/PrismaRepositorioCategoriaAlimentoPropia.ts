import type { PrismaClient } from "@prisma/client";
import type { ICategoriaAlimentoRepositorio } from "@/dominio/repositorios/ICategoriaAlimentoRepositorio";
import { CategoriaAlimento } from "@/dominio/entidades/CategoriaAlimento";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Categorías PROPIAS de un consultorio (migración 93). Tabla de inquilino: la
 * extensión filtra y asigna `nutricionistaId`, así que un consultorio nunca
 * ve, renombra ni borra las de otro.
 */
export class PrismaRepositorioCategoriaAlimentoPropia implements ICategoriaAlimentoRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(categoria: CategoriaAlimento): Promise<CategoriaAlimento> {
    const d = categoria.aPrimitivos();
    const fila = await this.prisma.categoriaAlimentoPropia.create({
      data: {
        id: d.id,
        nutricionistaId: inquilinoActual(),
        nombre: d.nombre,
        claveNombre: categoria.claveNombre,
      },
    });
    return mapearPropia(fila);
  }

  async actualizar(categoria: CategoriaAlimento): Promise<CategoriaAlimento> {
    const d = categoria.aPrimitivos();
    const fila = await this.prisma.categoriaAlimentoPropia.update({
      where: { id: d.id },
      data: { nombre: d.nombre, claveNombre: categoria.claveNombre },
    });
    return mapearPropia(fila);
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.categoriaAlimentoPropia.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<CategoriaAlimento | null> {
    const fila = await this.prisma.categoriaAlimentoPropia.findUnique({
      where: { id },
    });
    return fila ? mapearPropia(fila) : null;
  }

  async listar(): Promise<CategoriaAlimento[]> {
    const filas = await this.prisma.categoriaAlimentoPropia.findMany({
      orderBy: { nombre: "asc" },
    });
    return filas.map(mapearPropia);
  }

  async existeNombre(
    claveNombre: string,
    excluirId?: string,
  ): Promise<boolean> {
    const cantidad = await this.prisma.categoriaAlimentoPropia.count({
      where: {
        claveNombre,
        ...(excluirId ? { NOT: { id: excluirId } } : {}),
      },
    });
    return cantidad > 0;
  }
}

function mapearPropia(fila: {
  id: string;
  nombre: string;
  creadoEn: Date;
  actualizadoEn: Date;
}): CategoriaAlimento {
  return CategoriaAlimento.reconstruir({
    id: fila.id,
    nombre: fila.nombre,
    propia: true,
    orden: 0,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
