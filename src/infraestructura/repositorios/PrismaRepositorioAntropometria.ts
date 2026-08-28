import type { PrismaClient, Antropometria as AntropometriaFila } from "@prisma/client";
import type { IAntropometriaRepositorio } from "@/dominio/repositorios/IAntropometriaRepositorio";
import { Antropometria } from "@/dominio/entidades/Antropometria";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Implementación con Prisma del repositorio de Antropometría.
 * IMPORTANTE: los Decimal de Prisma se convierten a number en el mapeo;
 * nunca salen de infraestructura (superjson no los serializa).
 */
export class PrismaRepositorioAntropometria implements IAntropometriaRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(medicion: Antropometria): Promise<Antropometria> {
    const datos = medicion.aPrimitivos();
    const fila = await this.prisma.antropometria.create({
      data: {
        ...datos,
        nutricionistaId: inquilinoActual(),
        fecha: this.soloFecha(datos.fecha),
      },
    });
    return this.mapear(fila);
  }

  async actualizar(medicion: Antropometria): Promise<Antropometria> {
    const { id, pacienteId: _paciente, creadoEn: _creado, ...datos } = medicion.aPrimitivos();
    const fila = await this.prisma.antropometria.update({
      where: { id },
      data: { ...datos, fecha: this.soloFecha(datos.fecha) },
    });
    return this.mapear(fila);
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.antropometria.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<Antropometria | null> {
    const fila = await this.prisma.antropometria.findUnique({ where: { id } });
    return fila ? this.mapear(fila) : null;
  }

  async listarPorPaciente(pacienteId: string): Promise<Antropometria[]> {
    const filas = await this.prisma.antropometria.findMany({
      where: { pacienteId },
      orderBy: { fecha: "asc" },
    });
    return filas.map((fila) => this.mapear(fila));
  }

  async existeEnFecha(
    pacienteId: string,
    fecha: Date,
    excluirId?: string,
  ): Promise<boolean> {
    const cantidad = await this.prisma.antropometria.count({
      where: {
        pacienteId,
        fecha: this.soloFecha(fecha),
        ...(excluirId ? { id: { not: excluirId } } : {}),
      },
    });
    return cantidad > 0;
  }

  private soloFecha(fecha: Date): Date {
    return new Date(
      Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
    );
  }

  private mapear(fila: AntropometriaFila): Antropometria {
    return Antropometria.reconstruir({
      id: fila.id,
      pacienteId: fila.pacienteId,
      fecha: fila.fecha,
      pesoKg: Number(fila.pesoKg),
      tallaCm: aNumero(fila.tallaCm),
      tallaSentadoCm: aNumero(fila.tallaSentadoCm),
      nivelActividad: fila.nivelActividad,
      protocolo: fila.protocolo,
      metodoGrasa: fila.metodoGrasa,
      diamBiacromial: aNumero(fila.diamBiacromial),
      diamToraxTransverso: aNumero(fila.diamToraxTransverso),
      diamToraxAnteroposterior: aNumero(fila.diamToraxAnteroposterior),
      diamBiiliocrestideo: aNumero(fila.diamBiiliocrestideo),
      diamHumeral: aNumero(fila.diamHumeral),
      diamFemoral: aNumero(fila.diamFemoral),
      pliegueTricipital: aNumero(fila.pliegueTricipital),
      pliegueSubescapular: aNumero(fila.pliegueSubescapular),
      pliegueSupraespinal: aNumero(fila.pliegueSupraespinal),
      pliegueAbdominal: aNumero(fila.pliegueAbdominal),
      pliegueMuslo: aNumero(fila.pliegueMuslo),
      plieguePantorrilla: aNumero(fila.plieguePantorrilla),
      pliegueBicipital: aNumero(fila.pliegueBicipital),
      pliegueCrestaIliaca: aNumero(fila.pliegueCrestaIliaca),
      circTorax: aNumero(fila.circTorax),
      circCinturaMinima: aNumero(fila.circCinturaMinima),
      circCinturaMaxima: aNumero(fila.circCinturaMaxima),
      circCadera: aNumero(fila.circCadera),
      circBrazo: aNumero(fila.circBrazo),
      circBrazoContraido: aNumero(fila.circBrazoContraido),
      circCabeza: aNumero(fila.circCabeza),
      circAntebrazo: aNumero(fila.circAntebrazo),
      circMusloMaximo: aNumero(fila.circMusloMaximo),
      circMusloMedial: aNumero(fila.circMusloMedial),
      circPantorrilla: aNumero(fila.circPantorrilla),
      kgGrasa: aNumero(fila.kgGrasa),
      observaciones: fila.observaciones,
      creadoEn: fila.creadoEn,
    });
  }
}

/** Decimal de Prisma (o null) → number (o null). */
function aNumero(valor: { toNumber(): number } | null): number | null {
  return valor === null ? null : valor.toNumber();
}
