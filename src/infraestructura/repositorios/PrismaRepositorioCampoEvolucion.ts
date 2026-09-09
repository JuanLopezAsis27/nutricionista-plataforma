import type { PrismaClient, CampoEvolucion as CampoFila } from "@prisma/client";
import type { ICampoEvolucionRepositorio } from "@/dominio/repositorios/ICampoEvolucionRepositorio";
import { CampoEvolucion } from "@/dominio/entidades/CampoEvolucion";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";

/**
 * Implementación con Prisma de los campos personalizados de evolución
 * definidos por el consultorio.
 */
export class PrismaRepositorioCampoEvolucion
  extends RepositorioPrismaBase<CampoFila, CampoEvolucion>
  implements ICampoEvolucionRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.campoEvolucion);
  }

  async obtenerTodos(): Promise<CampoEvolucion[]> {
    const filas = await this.prisma.campoEvolucion.findMany({
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    });
    return filas.map(mapearCampoEvolucion);
  }

  async obtenerPorNombre(nombre: string): Promise<CampoEvolucion | null> {
    const fila = await this.prisma.campoEvolucion.findFirst({
      where: { nombre },
    });
    return fila ? mapearCampoEvolucion(fila) : null;
  }

  async crear(campo: CampoEvolucion): Promise<CampoEvolucion> {
    const datos = campo.aPrimitivos();
    const fila = await this.prisma.campoEvolucion.create({
      data: {
        id: datos.id,
        nutricionistaId: inquilinoActual(),
        clave: datos.clave,
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        orden: datos.orden,
      },
    });
    return mapearCampoEvolucion(fila);
  }

  async actualizar(campo: CampoEvolucion): Promise<CampoEvolucion> {
    const datos = campo.aPrimitivos();
    // `clave` queda fuera del update a propósito: es la que ata el campo a los
    // valores ya cargados en las evoluciones, y renombrar no puede moverla.
    const fila = await this.prisma.campoEvolucion.update({
      where: { id: datos.id },
      data: {
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        orden: datos.orden,
      },
    });
    return mapearCampoEvolucion(fila);
  }

  protected override mapear(fila: CampoFila): CampoEvolucion {
    return mapearCampoEvolucion(fila);
  }
}

export function mapearCampoEvolucion(fila: CampoFila): CampoEvolucion {
  return CampoEvolucion.reconstruir({
    id: fila.id,
    clave: fila.clave,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    orden: fila.orden,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
