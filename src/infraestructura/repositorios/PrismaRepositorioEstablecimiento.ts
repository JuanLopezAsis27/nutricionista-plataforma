import type {
  PrismaClient,
  Establecimiento as EstablecimientoFila,
} from "@prisma/client";
import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
import { Establecimiento } from "@/dominio/entidades/Establecimiento";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";

/**
 * Implementación con Prisma del repositorio de establecimientos.
 *
 * No hereda `eliminar` con sentido: la baja es lógica (`archivadoEn`) y se
 * hace por `actualizar`. El borrado real queda disponible por la base, pero la
 * FK desde `turnos` es RESTRICT y lo rechaza en cuanto la sede tuvo un turno.
 */
export class PrismaRepositorioEstablecimiento
  extends RepositorioPrismaBase<EstablecimientoFila, Establecimiento>
  implements IEstablecimientoRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.establecimiento);
  }

  async crear(establecimiento: Establecimiento): Promise<Establecimiento> {
    const d = establecimiento.aPrimitivos();
    const fila = await this.prisma.establecimiento.create({
      data: { nutricionistaId: inquilinoActual(), ...d },
    });
    return mapearEstablecimiento(fila);
  }

  async actualizar(establecimiento: Establecimiento): Promise<Establecimiento> {
    const d = establecimiento.aPrimitivos();
    const fila = await this.prisma.establecimiento.update({
      where: { id: d.id },
      data: {
        nombre: d.nombre,
        direccion: d.direccion,
        telefono: d.telefono,
        color: d.color,
        orden: d.orden,
        esPrincipal: d.esPrincipal,
        archivadoEn: d.archivadoEn,
        turnoDuracionMinutos: d.turnoDuracionMinutos,
        turnoPasoMinutos: d.turnoPasoMinutos,
        atencionHoraDesde: d.atencionHoraDesde,
        atencionHoraHasta: d.atencionHoraHasta,
        diasAtencion: d.diasAtencion,
      },
    });
    return mapearEstablecimiento(fila);
  }

  async listar(
    opciones: { incluirArchivados?: boolean } = {},
  ): Promise<Establecimiento[]> {
    const filas = await this.prisma.establecimiento.findMany({
      where: opciones.incluirArchivados ? {} : { archivadoEn: null },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    });
    return this.mapearTodas(filas);
  }

  async obtenerPrincipal(): Promise<Establecimiento | null> {
    const fila = await this.prisma.establecimiento.findFirst({
      where: { esPrincipal: true, archivadoEn: null },
    });
    return fila ? mapearEstablecimiento(fila) : null;
  }

  /**
   * Los dos UPDATE van en una transacción y en este orden porque hay un índice
   * único parcial (`establecimientos_uno_principal_uk`): marcar antes de
   * desmarcar deja un instante con dos principales que Postgres rechaza.
   *
   * El `updateMany` sin filtro de inquilino no es un descuido: la extensión de
   * Prisma le agrega el `nutricionistaId` del alcance actual, igual que a
   * cualquier consulta de una tabla de inquilino.
   */
  async fijarPrincipal(id: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.establecimiento.updateMany({
        where: { esPrincipal: true, NOT: { id } },
        data: { esPrincipal: false },
      }),
      this.prisma.establecimiento.update({
        where: { id },
        data: { esPrincipal: true },
      }),
    ]);
  }

  /**
   * `mode: "insensitive"` para que "Consultorio Centro" y "consultorio centro"
   * cuenten como el mismo lugar: nadie los distingue mirando la lista.
   */
  async existeNombre(nombre: string, excluirId?: string): Promise<boolean> {
    const cantidad = await this.prisma.establecimiento.count({
      where: {
        nombre: { equals: nombre, mode: "insensitive" },
        archivadoEn: null,
        ...(excluirId ? { NOT: { id: excluirId } } : {}),
      },
    });
    return cantidad > 0;
  }

  async tieneTurnos(id: string): Promise<boolean> {
    const cantidad = await this.prisma.turno.count({
      where: { establecimientoId: id },
    });
    return cantidad > 0;
  }

  protected override mapear(fila: EstablecimientoFila): Establecimiento {
    return mapearEstablecimiento(fila);
  }
}

/** Mapea una fila de Prisma a la entidad de dominio Establecimiento. */
export function mapearEstablecimiento(
  fila: EstablecimientoFila,
): Establecimiento {
  return Establecimiento.reconstruir({
    id: fila.id,
    nombre: fila.nombre,
    direccion: fila.direccion,
    telefono: fila.telefono,
    color: fila.color,
    orden: fila.orden,
    esPrincipal: fila.esPrincipal,
    archivadoEn: fila.archivadoEn,
    turnoDuracionMinutos: fila.turnoDuracionMinutos,
    turnoPasoMinutos: fila.turnoPasoMinutos,
    atencionHoraDesde: fila.atencionHoraDesde,
    atencionHoraHasta: fila.atencionHoraHasta,
    diasAtencion: fila.diasAtencion,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
