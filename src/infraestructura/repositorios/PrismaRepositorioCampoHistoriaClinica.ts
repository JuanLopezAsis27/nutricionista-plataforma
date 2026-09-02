import type {
  PrismaClient,
  CampoHistoriaClinica as CampoFila,
} from "@prisma/client";
import type { ICampoHistoriaClinicaRepositorio } from "@/dominio/repositorios/ICampoHistoriaClinicaRepositorio";
import { CampoHistoriaClinica } from "@/dominio/entidades/CampoHistoriaClinica";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Implementación con Prisma de los campos personalizados de historia clínica
 * definidos por el consultorio.
 */
export class PrismaRepositorioCampoHistoriaClinica implements ICampoHistoriaClinicaRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async obtenerTodos(): Promise<CampoHistoriaClinica[]> {
    const filas = await this.prisma.campoHistoriaClinica.findMany({
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    });
    return filas.map(mapearCampoHistoriaClinica);
  }

  async obtenerPorId(id: string): Promise<CampoHistoriaClinica | null> {
    const fila = await this.prisma.campoHistoriaClinica.findUnique({
      where: { id },
    });
    return fila ? mapearCampoHistoriaClinica(fila) : null;
  }

  async obtenerPorNombre(nombre: string): Promise<CampoHistoriaClinica | null> {
    const fila = await this.prisma.campoHistoriaClinica.findFirst({
      where: { nombre },
    });
    return fila ? mapearCampoHistoriaClinica(fila) : null;
  }

  async crear(campo: CampoHistoriaClinica): Promise<CampoHistoriaClinica> {
    const datos = campo.aPrimitivos();
    const fila = await this.prisma.campoHistoriaClinica.create({
      data: {
        id: datos.id,
        nutricionistaId: inquilinoActual(),
        clave: datos.clave,
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        orden: datos.orden,
      },
    });
    return mapearCampoHistoriaClinica(fila);
  }

  async actualizar(campo: CampoHistoriaClinica): Promise<CampoHistoriaClinica> {
    const datos = campo.aPrimitivos();
    // `clave` queda fuera del update a propósito: es la que ata el campo a los
    // valores ya cargados en las historias, y renombrar no puede moverla.
    const fila = await this.prisma.campoHistoriaClinica.update({
      where: { id: datos.id },
      data: {
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        orden: datos.orden,
      },
    });
    return mapearCampoHistoriaClinica(fila);
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.campoHistoriaClinica.delete({ where: { id } });
  }
}

export function mapearCampoHistoriaClinica(
  fila: CampoFila,
): CampoHistoriaClinica {
  return CampoHistoriaClinica.reconstruir({
    id: fila.id,
    clave: fila.clave,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    orden: fila.orden,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
