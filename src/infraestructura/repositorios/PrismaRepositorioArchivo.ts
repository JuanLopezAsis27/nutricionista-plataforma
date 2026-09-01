import type { PrismaClient, Archivo as ArchivoFila } from "@prisma/client";
import type {
  IArchivoRepositorio,
  DuenoArchivo,
} from "@/dominio/repositorios/IArchivoRepositorio";
import { Archivo } from "@/dominio/entidades/Archivo";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";

/** Implementación con Prisma del repositorio de metadatos de Archivo. */
export class PrismaRepositorioArchivo
  extends RepositorioPrismaBase<ArchivoFila, Archivo>
  implements IArchivoRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.archivo);
  }

  async crear(archivo: Archivo, dueno?: DuenoArchivo): Promise<Archivo> {
    const datos = archivo.aPrimitivos();
    const fila = await this.prisma.archivo.create({
      data: {
        nutricionistaId: inquilinoActual(),
        ...datos,
        pacienteId: dueno?.pacienteId ?? null,
        laboratorioId: dueno?.laboratorioId ?? null,
        comidaConsumidaId: dueno?.comidaConsumidaId ?? null,
        recetaId: dueno?.recetaId ?? null,
        materialId: dueno?.materialId ?? null,
        planId: dueno?.planId ?? null,
        grabacionId: dueno?.grabacionId ?? null,
      },
    });
    return mapearArchivo(fila);
  }

  async listarPorDueno(dueno: DuenoArchivo): Promise<Archivo[]> {
    const filas = await this.prisma.archivo.findMany({
      where: {
        pacienteId: dueno.pacienteId,
        laboratorioId: dueno.laboratorioId,
        comidaConsumidaId: dueno.comidaConsumidaId,
        recetaId: dueno.recetaId,
        materialId: dueno.materialId,
        planId: dueno.planId,
        grabacionId: dueno.grabacionId,
      },
      orderBy: { creadoEn: "desc" },
    });
    return this.mapearTodas(filas);
  }

  async vincularDueno(id: string, dueno: DuenoArchivo): Promise<void> {
    await this.prisma.archivo.update({
      where: { id },
      data: {
        pacienteId: dueno.pacienteId ?? null,
        laboratorioId: dueno.laboratorioId ?? null,
        comidaConsumidaId: dueno.comidaConsumidaId ?? null,
        recetaId: dueno.recetaId ?? null,
        materialId: dueno.materialId ?? null,
        planId: dueno.planId ?? null,
        grabacionId: dueno.grabacionId ?? null,
      },
    });
  }

  async obtenerDueno(id: string): Promise<DuenoArchivo | null> {
    const fila = await this.prisma.archivo.findUnique({
      where: { id },
      select: {
        pacienteId: true,
        laboratorioId: true,
        comidaConsumidaId: true,
        recetaId: true,
        materialId: true,
        planId: true,
        grabacionId: true,
      },
    });
    if (!fila) return null;
    return {
      pacienteId: fila.pacienteId ?? undefined,
      laboratorioId: fila.laboratorioId ?? undefined,
      comidaConsumidaId: fila.comidaConsumidaId ?? undefined,
      recetaId: fila.recetaId ?? undefined,
      materialId: fila.materialId ?? undefined,
      planId: fila.planId ?? undefined,
      grabacionId: fila.grabacionId ?? undefined,
    };
  }

  async listarClaves(): Promise<string[]> {
    const filas = await this.prisma.archivo.findMany({
      select: { clave: true },
    });
    return filas.map((fila) => fila.clave);
  }

  protected override mapear(fila: ArchivoFila): Archivo {
    return mapearArchivo(fila);
  }
}

export function mapearArchivo(fila: ArchivoFila): Archivo {
  return Archivo.reconstruir({
    id: fila.id,
    clave: fila.clave,
    nombreOriginal: fila.nombreOriginal,
    mimeType: fila.mimeType,
    tamanoBytes: fila.tamanoBytes,
    titulo: fila.titulo,
    categoria: fila.categoria,
    subidoPorId: fila.subidoPorId,
    creadoEn: fila.creadoEn,
  });
}
