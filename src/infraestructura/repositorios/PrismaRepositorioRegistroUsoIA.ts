import { Prisma, type PrismaClient } from "@prisma/client";
import type { ProveedorClaveIA } from "@/dominio/repositorios/IConfiguracionIAGlobalRepositorio";
import type {
  CapacidadIA,
  FiltroRegistrosUsoIA,
  IRegistroUsoIARepositorio,
  RegistroUsoIA,
  ResumenUsoIA,
  TotalesUsoIA,
  UsoIA,
} from "@/dominio/repositorios/IRegistroUsoIARepositorio";

/** Tope del texto de error guardado: alcanza para leer el motivo. */
const LARGO_ERROR = 500;

interface Agregado {
  _count: { _all: number };
  _sum: {
    tokensEntrada: number | null;
    tokensSalida: number | null;
    costoUsd: number | null;
  };
}

interface FilaDia {
  dia: Date;
  llamadas: bigint;
  errores: bigint;
  tokens_entrada: bigint | null;
  tokens_salida: bigint | null;
  costo: number | null;
}

/**
 * Registro de uso de la IA.
 *
 * Escribe dentro del alcance del consultorio que hizo la llamada (la
 * extensión multi-inquilino le pone el `nutricionistaId`) y lee en alcance
 * global, que es el del SUPERADMIN.
 */
export class PrismaRepositorioRegistroUsoIA implements IRegistroUsoIARepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async registrar(uso: UsoIA): Promise<void> {
    await this.prisma.registroUsoIA.create({
      data: {
        capacidad: uso.capacidad,
        proveedor: uso.proveedor,
        modelo: uso.modelo,
        operacion: uso.operacion,
        tokensEntrada: uso.tokensEntrada,
        tokensSalida: uso.tokensSalida,
        costoUsd: uso.costoUsd,
        exito: uso.exito,
        error: uso.error?.slice(0, LARGO_ERROR) ?? null,
        duracionMs: Math.round(uso.duracionMs),
      },
    });
  }

  async resumir(desde: Date): Promise<ResumenUsoIA> {
    const where = { creadoEn: { gte: desde } };
    const conErrores = { ...where, exito: false };
    const suma = {
      _count: { _all: true },
      _sum: { tokensEntrada: true, tokensSalida: true, costoUsd: true },
    } as const;
    const tabla = this.prisma.registroUsoIA;

    const [
      total,
      errores,
      porProveedor,
      erroresProveedor,
      porModelo,
      erroresModelo,
      porConsultorio,
      erroresConsultorio,
      porDia,
    ] = await Promise.all([
      tabla.aggregate({ where, ...suma }),
      tabla.count({ where: conErrores }),
      tabla.groupBy({ by: ["proveedor", "capacidad"], where, ...suma }),
      tabla.groupBy({
        by: ["proveedor", "capacidad"],
        where: conErrores,
        _count: { _all: true },
      }),
      tabla.groupBy({ by: ["proveedor", "modelo"], where, ...suma }),
      tabla.groupBy({
        by: ["proveedor", "modelo"],
        where: conErrores,
        _count: { _all: true },
      }),
      tabla.groupBy({ by: ["nutricionistaId"], where, ...suma }),
      tabla.groupBy({
        by: ["nutricionistaId"],
        where: conErrores,
        _count: { _all: true },
      }),
      // Por día va en SQL: `groupBy` de Prisma no agrupa por un pedazo de
      // una fecha, y traer las filas para agruparlas acá no escala.
      this.prisma.$queryRaw<FilaDia[]>(Prisma.sql`
        SELECT date_trunc('day', "creadoEn") AS dia,
               COUNT(*) AS llamadas,
               COUNT(*) FILTER (WHERE NOT "exito") AS errores,
               SUM("tokensEntrada") AS tokens_entrada,
               SUM("tokensSalida") AS tokens_salida,
               SUM("costoUsd") AS costo
        FROM "registros_uso_ia"
        WHERE "creadoEn" >= ${desde}
        GROUP BY 1
        ORDER BY 1
      `),
    ]);

    const clave = (...partes: (string | null)[]): string => partes.join("|");
    const erroresPorProveedor = new Map(
      erroresProveedor.map((f) => [
        clave(f.proveedor, f.capacidad),
        f._count._all,
      ]),
    );
    const erroresPorModelo = new Map(
      erroresModelo.map((f) => [clave(f.proveedor, f.modelo), f._count._all]),
    );
    const erroresPorConsultorio = new Map(
      erroresConsultorio.map((f) => [clave(f.nutricionistaId), f._count._all]),
    );
    const emailDe = await this.emailsDeConsultorios(
      porConsultorio.map((f) => f.nutricionistaId),
    );

    return {
      totales: totales(total, errores),
      porProveedor: porProveedor
        .map((f) => ({
          proveedor: f.proveedor as ProveedorClaveIA,
          capacidad: f.capacidad as CapacidadIA,
          ...totales(
            f,
            erroresPorProveedor.get(clave(f.proveedor, f.capacidad)) ?? 0,
          ),
        }))
        .sort((a, b) => b.llamadas - a.llamadas),
      porModelo: porModelo
        .map((f) => ({
          proveedor: f.proveedor as ProveedorClaveIA,
          modelo: f.modelo,
          ...totales(
            f,
            erroresPorModelo.get(clave(f.proveedor, f.modelo)) ?? 0,
          ),
        }))
        .sort((a, b) => b.llamadas - a.llamadas),
      porConsultorio: porConsultorio
        .map((f) => ({
          nutricionistaId: f.nutricionistaId,
          consultorio: f.nutricionistaId
            ? (emailDe.get(f.nutricionistaId) ?? null)
            : null,
          ...totales(
            f,
            erroresPorConsultorio.get(clave(f.nutricionistaId)) ?? 0,
          ),
        }))
        .sort((a, b) => b.llamadas - a.llamadas),
      porDia: porDia.map((f) => ({
        dia: f.dia.toISOString().slice(0, 10),
        llamadas: Number(f.llamadas),
        errores: Number(f.errores),
        tokensEntrada: Number(f.tokens_entrada ?? 0),
        tokensSalida: Number(f.tokens_salida ?? 0),
        costoUsd: f.costo,
      })),
    };
  }

  async listar(
    filtro: FiltroRegistrosUsoIA,
  ): Promise<{ registros: RegistroUsoIA[]; total: number }> {
    const where: Prisma.RegistroUsoIAWhereInput = {
      ...(filtro.soloErrores ? { exito: false } : {}),
      ...(filtro.nutricionistaId
        ? { nutricionistaId: filtro.nutricionistaId }
        : {}),
    };
    const [filas, total] = await Promise.all([
      this.prisma.registroUsoIA.findMany({
        where,
        orderBy: { creadoEn: "desc" },
        skip: (filtro.pagina - 1) * filtro.porPagina,
        take: filtro.porPagina,
      }),
      this.prisma.registroUsoIA.count({ where }),
    ]);
    const emailDe = await this.emailsDeConsultorios(
      filas.map((f) => f.nutricionistaId),
    );

    return {
      total,
      registros: filas.map((f) => ({
        id: f.id,
        nutricionistaId: f.nutricionistaId,
        consultorio: f.nutricionistaId
          ? (emailDe.get(f.nutricionistaId) ?? null)
          : null,
        capacidad: f.capacidad as CapacidadIA,
        proveedor: f.proveedor as ProveedorClaveIA,
        modelo: f.modelo,
        operacion: f.operacion,
        tokensEntrada: f.tokensEntrada,
        tokensSalida: f.tokensSalida,
        costoUsd: f.costoUsd,
        exito: f.exito,
        error: f.error,
        duracionMs: f.duracionMs,
        creadoEn: f.creadoEn,
      })),
    };
  }

  /**
   * El consultorio no tiene nombre propio en la base: se lo reconoce por el
   * email de su cuenta de NUTRICIONISTA.
   */
  private async emailsDeConsultorios(
    ids: (string | null)[],
  ): Promise<Map<string, string>> {
    const unicos = [...new Set(ids.filter((id): id is string => id !== null))];
    if (unicos.length === 0) return new Map();
    const cuentas = await this.prisma.usuario.findMany({
      where: { rol: "NUTRICIONISTA", nutricionistaId: { in: unicos } },
      select: { nutricionistaId: true, email: true },
    });
    return new Map(
      cuentas
        .filter((c) => c.nutricionistaId !== null && c.email !== null)
        .map((c) => [c.nutricionistaId!, c.email!]),
    );
  }
}

function totales(fila: Agregado, errores: number): TotalesUsoIA {
  return {
    llamadas: fila._count._all,
    errores,
    tokensEntrada: fila._sum.tokensEntrada ?? 0,
    tokensSalida: fila._sum.tokensSalida ?? 0,
    costoUsd: fila._sum.costoUsd,
  };
}
