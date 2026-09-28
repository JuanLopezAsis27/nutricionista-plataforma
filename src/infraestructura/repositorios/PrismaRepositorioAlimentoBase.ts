import type {
  PrismaClient,
  AlimentoBase as AlimentoBaseFila,
} from "@prisma/client";
import type {
  IAlimentoPropioRepositorio,
  FiltroAlimentosPropios,
} from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import type {
  AlimentoPropio,
  CategoriaAlimento,
} from "@/dominio/entidades/AlimentoPropio";
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";
import {
  datosDeAlimento,
  mapearFilaAlimento,
  dondeAlimento,
} from "./base/filasAlimento";

const TAMANO_LOTE = 500; // filas por INSERT (evita el límite de parámetros de PG)

/**
 * Repositorio Prisma de los alimentos PREDETERMINADOS de la plataforma
 * (migración 82).
 *
 * Implementa el MISMO contrato que la lista propia de un consultorio
 * (`IAlimentoPropioRepositorio`): son la misma colección —alimentos con macros
 * por 100 g, que se importan de una planilla, se editan de a uno y se buscan
 * por nombre— con otro dueño. Así los casos de uso de la lista propia sirven
 * tal cual para el catálogo, cableados con este repositorio.
 *
 * Sin inquilino: `alimentos_base` no está en MODELOS_INQUILINO. Lo lee todo
 * consultorio; lo escribe solo el SUPERADMIN.
 */
export class PrismaRepositorioAlimentoBase
  extends RepositorioPrismaBase<AlimentoBaseFila, AlimentoPropio>
  implements IAlimentoPropioRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.alimentoBase);
  }

  async reemplazarTodos(alimentos: AlimentoPropio[]): Promise<number> {
    const filas = alimentos.map(datosDeAlimento);
    const lotes: (typeof filas)[] = [];
    for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
      lotes.push(filas.slice(i, i + TAMANO_LOTE));
    }
    await this.prisma.$transaction([
      this.prisma.alimentoBase.deleteMany({}),
      ...lotes.map((lote) =>
        this.prisma.alimentoBase.createMany({ data: lote }),
      ),
    ]);
    return filas.length;
  }

  async crear(alimento: AlimentoPropio): Promise<AlimentoPropio> {
    const fila = await this.prisma.alimentoBase.create({
      data: datosDeAlimento(alimento),
    });
    return mapearFilaAlimento(fila);
  }

  async actualizar(alimento: AlimentoPropio): Promise<AlimentoPropio> {
    const { id, ...datos } = datosDeAlimento(alimento);
    const fila = await this.prisma.alimentoBase.update({
      where: { id },
      data: datos,
    });
    return mapearFilaAlimento(fila);
  }

  async obtenerPorClave(clave: string): Promise<AlimentoPropio | null> {
    const fila = await this.prisma.alimentoBase.findUnique({
      where: { claveIdentidad: clave },
    });
    return fila ? mapearFilaAlimento(fila) : null;
  }

  async clavesExistentes(claves: string[]): Promise<string[]> {
    const existentes: string[] = [];
    // De a lotes: una planilla puede traer miles, y un IN enorme pasa el
    // límite de parámetros de Postgres.
    for (let i = 0; i < claves.length; i += TAMANO_LOTE) {
      const filas = await this.prisma.alimentoBase.findMany({
        where: { claveIdentidad: { in: claves.slice(i, i + TAMANO_LOTE) } },
        select: { claveIdentidad: true },
      });
      existentes.push(...filas.map((f) => f.claveIdentidad));
    }
    return existentes;
  }

  async listar(filtro?: FiltroAlimentosPropios): Promise<AlimentoPropio[]> {
    const filas = await this.prisma.alimentoBase.findMany({
      where: dondeAlimento(filtro),
      orderBy: { nombreNormalizado: "asc" },
      take: filtro?.limite,
      skip: filtro?.desplazamiento,
    });
    return this.mapearTodas(filas);
  }

  async buscar(
    termino: string,
    limite: number,
    categoria?: CategoriaAlimento,
  ): Promise<AlimentoPropio[]> {
    if (termino.trim().length === 0 && !categoria) return [];
    return this.listar({ busqueda: termino, categoria, limite });
  }

  contar(filtro?: FiltroAlimentosPropios): Promise<number> {
    return this.prisma.alimentoBase.count({ where: dondeAlimento(filtro) });
  }

  async vaciar(): Promise<void> {
    await this.prisma.alimentoBase.deleteMany({});
  }

  async listarClavesDeImagen(): Promise<string[]> {
    const filas = await this.prisma.alimentoBase.findMany({
      where: { imagenClave: { not: null } },
      select: { imagenClave: true },
    });
    return filas.flatMap((f) => (f.imagenClave ? [f.imagenClave] : []));
  }

  protected override mapear(fila: AlimentoBaseFila): AlimentoPropio {
    return mapearFilaAlimento(fila);
  }
}
