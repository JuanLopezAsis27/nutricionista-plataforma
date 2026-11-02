import type { PrismaClient } from "@prisma/client";
import type { ICategoriaAlimentoRepositorio } from "@/dominio/repositorios/ICategoriaAlimentoRepositorio";
import { CategoriaAlimento } from "@/dominio/entidades/CategoriaAlimento";

/**
 * Categorías PREDETERMINADAS de alimento (migración 93): sin inquilino, como
 * `alimentos_base`. Las lee todo consultorio; las escribe solo el SUPERADMIN.
 */
export class PrismaRepositorioCategoriaAlimentoBase implements ICategoriaAlimentoRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(categoria: CategoriaAlimento): Promise<CategoriaAlimento> {
    const d = categoria.aPrimitivos();
    const fila = await this.prisma.categoriaAlimentoBase.create({
      data: {
        id: d.id,
        nombre: d.nombre,
        claveNombre: categoria.claveNombre,
        orden: d.orden,
      },
    });
    return mapearBase(fila);
  }

  async actualizar(categoria: CategoriaAlimento): Promise<CategoriaAlimento> {
    const d = categoria.aPrimitivos();
    const fila = await this.prisma.categoriaAlimentoBase.update({
      where: { id: d.id },
      data: {
        nombre: d.nombre,
        claveNombre: categoria.claveNombre,
        orden: d.orden,
      },
    });
    return mapearBase(fila);
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.categoriaAlimentoBase.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<CategoriaAlimento | null> {
    const fila = await this.prisma.categoriaAlimentoBase.findUnique({
      where: { id },
    });
    return fila ? mapearBase(fila) : null;
  }

  async listar(): Promise<CategoriaAlimento[]> {
    const filas = await this.prisma.categoriaAlimentoBase.findMany({
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    });
    return filas.map(mapearBase);
  }

  async existeNombre(
    claveNombre: string,
    excluirId?: string,
  ): Promise<boolean> {
    const cantidad = await this.prisma.categoriaAlimentoBase.count({
      where: {
        claveNombre,
        ...(excluirId ? { NOT: { id: excluirId } } : {}),
      },
    });
    return cantidad > 0;
  }
}

function mapearBase(fila: {
  id: string;
  nombre: string;
  orden: number;
  creadoEn: Date;
  actualizadoEn: Date;
}): CategoriaAlimento {
  return CategoriaAlimento.reconstruir({
    id: fila.id,
    nombre: fila.nombre,
    propia: false,
    orden: fila.orden,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
