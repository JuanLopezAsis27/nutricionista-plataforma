import type { PrismaClient } from "@prisma/client";
import type {
  ArchivoUbicado,
  IUbicacionArchivosRepositorio,
  UbicacionArchivo,
} from "@/dominio/repositorios/IUbicacionArchivosRepositorio";

/**
 * Los archivos del consultorio con el dueño resuelto hasta el paciente, en
 * UNA consulta. La extensión multi-inquilino acota `archivos` y cada relación
 * incluida al consultorio en curso.
 */
export class PrismaRepositorioUbicacionArchivos implements IUbicacionArchivosRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async listar(): Promise<ArchivoUbicado[]> {
    const filas = await this.prisma.archivo.findMany({
      orderBy: { creadoEn: "asc" },
      select: {
        id: true,
        nombreOriginal: true,
        pacienteId: true,
        fechaProgreso: true,
        laboratorio: {
          select: { pacienteId: true, fecha: true, titulo: true },
        },
        comidaConsumida: {
          select: {
            franja: true,
            registro: { select: { pacienteId: true, fecha: true } },
          },
        },
        grabacion: {
          select: {
            orden: true,
            turno: { select: { pacienteId: true, fecha: true } },
          },
        },
        plan: {
          select: {
            nombre: true,
            asignaciones: { select: { pacienteId: true } },
          },
        },
        receta: { select: { nombre: true } },
        material: { select: { titulo: true } },
      },
    });

    return filas.map((fila) => {
      let ubicacion: UbicacionArchivo;
      if (fila.pacienteId) {
        ubicacion = {
          tipo: "PACIENTE",
          pacienteId: fila.pacienteId,
          fechaProgreso: fila.fechaProgreso,
        };
      } else if (fila.laboratorio) {
        ubicacion = { tipo: "LABORATORIO", ...fila.laboratorio };
      } else if (fila.comidaConsumida) {
        ubicacion = {
          tipo: "DIARIO",
          pacienteId: fila.comidaConsumida.registro.pacienteId,
          fecha: fila.comidaConsumida.registro.fecha,
          franja: fila.comidaConsumida.franja,
        };
      } else if (fila.grabacion) {
        ubicacion = {
          tipo: "GRABACION",
          pacienteId: fila.grabacion.turno.pacienteId,
          fecha: fila.grabacion.turno.fecha,
          orden: fila.grabacion.orden,
        };
      } else if (fila.plan) {
        ubicacion = {
          tipo: "PLAN",
          plan: fila.plan.nombre,
          pacienteIds: fila.plan.asignaciones.map((a) => a.pacienteId),
        };
      } else if (fila.receta) {
        ubicacion = { tipo: "RECETA", receta: fila.receta.nombre };
      } else if (fila.material) {
        ubicacion = { tipo: "MATERIAL", material: fila.material.titulo };
      } else {
        ubicacion = { tipo: "SIN_DUENO" };
      }
      return { id: fila.id, nombreOriginal: fila.nombreOriginal, ubicacion };
    });
  }
}
