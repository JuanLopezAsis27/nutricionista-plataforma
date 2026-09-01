import type { PrismaClient, Prisma } from "@prisma/client";
import type { IGrabacionConsultaRepositorio } from "@/dominio/repositorios/IGrabacionConsultaRepositorio";
import { GrabacionConsulta } from "@/dominio/entidades/GrabacionConsulta";
import { ResumenConsulta } from "@/dominio/entidades/ResumenConsulta";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/** Fila de grabación con el archivo de audio incluido. */
type GrabacionConArchivo = Prisma.GrabacionConsultaGetPayload<{
  include: { archivo: true };
}>;

const INCLUIR = { archivo: true } satisfies Prisma.GrabacionConsultaInclude;

/** Implementación con Prisma del repositorio de grabaciones y resúmenes. */
export class PrismaRepositorioGrabacionConsulta implements IGrabacionConsultaRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(
    grabacion: GrabacionConsulta,
    archivoId: string,
  ): Promise<GrabacionConsulta> {
    const d = grabacion.aPrimitivos();
    const inquilino = inquilinoActual();

    // Fila y vínculo del audio en una transacción: si el vínculo falla, no
    // queda una grabación sin audio que el worker tomaría para fallar.
    const fila = await this.prisma.$transaction(async (tx) => {
      await tx.grabacionConsulta.create({
        data: {
          id: d.id,
          nutricionistaId: inquilino,
          turnoId: d.turnoId,
          orden: d.orden,
          duracionSegundos: d.duracionSegundos,
          estado: d.estado,
          transcripcion: d.transcripcion,
          error: d.error,
          intentos: d.intentos,
          transcritoEn: d.transcritoEn,
          creadoEn: d.creadoEn,
          actualizadoEn: d.actualizadoEn,
        },
      });
      await tx.archivo.update({
        where: { id: archivoId },
        data: { grabacionId: d.id },
      });
      return tx.grabacionConsulta.findUniqueOrThrow({
        where: { id: d.id },
        include: INCLUIR,
      });
    });

    return mapearGrabacion(fila);
  }

  async guardar(grabacion: GrabacionConsulta): Promise<GrabacionConsulta> {
    const d = grabacion.aPrimitivos();
    const fila = await this.prisma.grabacionConsulta.update({
      where: { id: d.id },
      data: {
        estado: d.estado,
        transcripcion: d.transcripcion,
        error: d.error,
        intentos: d.intentos,
        transcritoEn: d.transcritoEn,
        duracionSegundos: d.duracionSegundos,
      },
      include: INCLUIR,
    });
    return mapearGrabacion(fila);
  }

  async eliminar(id: string): Promise<void> {
    // La fila del archivo cae en cascada; el objeto del bucket lo borra el caso
    // de uso.
    await this.prisma.grabacionConsulta.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<GrabacionConsulta | null> {
    const fila = await this.prisma.grabacionConsulta.findUnique({
      where: { id },
      include: INCLUIR,
    });
    return fila ? mapearGrabacion(fila) : null;
  }

  async listarPorTurno(turnoId: string): Promise<GrabacionConsulta[]> {
    const filas = await this.prisma.grabacionConsulta.findMany({
      where: { turnoId },
      include: INCLUIR,
      orderBy: { orden: "asc" },
    });
    return filas.map(mapearGrabacion);
  }

  async siguienteOrden(turnoId: string): Promise<number> {
    // Se toma el MÁXIMO y no la cantidad: borrar la grabación 2 de tres dejaría
    // dos filas con órdenes 1 y 3, y contar daría 3 —que ya está usado y choca
    // contra el índice único—.
    const agregado = await this.prisma.grabacionConsulta.aggregate({
      where: { turnoId },
      _max: { orden: true },
    });
    return (agregado._max.orden ?? 0) + 1;
  }

  async obtenerInquilinoGlobal(id: string): Promise<string | null> {
    const fila = await this.prisma.grabacionConsulta.findUnique({
      where: { id },
      select: { nutricionistaId: true },
    });
    return fila?.nutricionistaId ?? null;
  }

  async listarPendientesGlobal(
    limite: number,
  ): Promise<{ id: string; nutricionistaId: string }[]> {
    // TRANSCRIBIENDO entra además de PENDIENTE: es el estado en el que queda
    // una grabación cuyo worker murió a mitad de camino, y nadie la volvería a
    // tomar nunca. El contador de intentos de la entidad es lo que impide que
    // este rescate se vuelva un bucle infinito sobre un audio que no sirve.
    const filas = await this.prisma.grabacionConsulta.findMany({
      where: { estado: { in: ["PENDIENTE", "TRANSCRIBIENDO"] } },
      select: { id: true, nutricionistaId: true },
      orderBy: { creadoEn: "asc" },
      take: limite,
    });
    return filas;
  }

  async obtenerResumen(turnoId: string): Promise<ResumenConsulta | null> {
    const fila = await this.prisma.resumenConsulta.findUnique({
      where: { turnoId },
    });
    return fila ? mapearResumen(fila) : null;
  }

  async guardarResumen(resumen: ResumenConsulta): Promise<ResumenConsulta> {
    const d = resumen.aPrimitivos();
    const datos = {
      texto: d.texto,
      modelo: d.modelo,
      grabacionesIncluidas: d.grabacionesIncluidas,
      generadoEn: d.generadoEn,
    };
    // Upsert por turnoId y no por id: hay UNO por turno, y regenerar tiene que
    // pisar el que haya sin depender de que el llamador haya traído su id.
    const fila = await this.prisma.resumenConsulta.upsert({
      where: { turnoId: d.turnoId },
      create: {
        id: d.id,
        nutricionistaId: inquilinoActual(),
        turnoId: d.turnoId,
        ...datos,
      },
      update: datos,
    });
    return mapearResumen(fila);
  }
}

export function mapearGrabacion(fila: GrabacionConArchivo): GrabacionConsulta {
  return GrabacionConsulta.reconstruir({
    id: fila.id,
    turnoId: fila.turnoId,
    orden: fila.orden,
    duracionSegundos: fila.duracionSegundos,
    estado: fila.estado,
    transcripcion: fila.transcripcion,
    error: fila.error,
    intentos: fila.intentos,
    transcritoEn: fila.transcritoEn,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
    archivoId: fila.archivo?.id ?? null,
    nombreArchivo: fila.archivo?.nombreOriginal ?? null,
    mimeType: fila.archivo?.mimeType ?? null,
    tamanoBytes: fila.archivo?.tamanoBytes ?? null,
  });
}

function mapearResumen(fila: {
  id: string;
  turnoId: string;
  texto: string;
  modelo: string | null;
  grabacionesIncluidas: number;
  generadoEn: Date;
  actualizadoEn: Date;
}): ResumenConsulta {
  return ResumenConsulta.reconstruir({
    id: fila.id,
    turnoId: fila.turnoId,
    texto: fila.texto,
    modelo: fila.modelo,
    grabacionesIncluidas: fila.grabacionesIncluidas,
    generadoEn: fila.generadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
