import type {
  PrismaClient,
  Paciente as PacienteFila,
  Prisma,
} from "@prisma/client";
import type {
  IPacienteRepositorio,
  FiltroPacientes,
} from "@/dominio/repositorios/IPacienteRepositorio";
import { Paciente } from "@/dominio/entidades/Paciente";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Implementación con Prisma del repositorio de Paciente (adaptador de salida).
 *
 * Es intercambiable con cualquier otra implementación de IPacienteRepositorio
 * (LSP). Mapea filas de Prisma ⇄ entidad Paciente con mapearAPaciente().
 */
export class PrismaRepositorioPaciente implements IPacienteRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(paciente: Paciente): Promise<Paciente> {
    const datos = paciente.aPrimitivos();
    const fila = await this.prisma.paciente.create({
      data: {
        id: datos.id,
        nutricionistaId: inquilinoActual(),
        nombre: datos.nombre,
        apellido: datos.apellido,
        email: datos.email,
        telefono: datos.telefono,
        telefonoE164: datos.telefonoE164,
        fechaNacimiento: datos.fechaNacimiento,
        sexo: datos.sexo,
        notas: datos.notas,
        creadoEn: datos.creadoEn,
        actualizadoEn: datos.actualizadoEn,
      },
    });
    return mapearPaciente(fila);
  }

  async actualizar(paciente: Paciente): Promise<Paciente> {
    const datos = paciente.aPrimitivos();
    const fila = await this.prisma.paciente.update({
      where: { id: datos.id },
      data: {
        nombre: datos.nombre,
        apellido: datos.apellido,
        email: datos.email,
        telefono: datos.telefono,
        telefonoE164: datos.telefonoE164,
        fechaNacimiento: datos.fechaNacimiento,
        sexo: datos.sexo,
        notas: datos.notas,
        archivadoEn: datos.archivadoEn,
        motivoArchivado: datos.motivoArchivado,
        actualizadoEn: datos.actualizadoEn,
      },
    });
    return mapearPaciente(fila);
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.paciente.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<Paciente | null> {
    const fila = await this.prisma.paciente.findUnique({ where: { id } });
    return fila ? mapearPaciente(fila) : null;
  }

  async obtenerPorEmail(email: string): Promise<Paciente | null> {
    // El email dejó de ser único global (una persona puede ser paciente de dos
    // consultorios). La unicidad es (nutricionistaId, email) y el filtro de
    // inquilino lo agrega la extensión, así que acá alcanza con findFirst.
    const fila = await this.prisma.paciente.findFirst({
      where: { email: email.trim().toLowerCase() },
    });
    return fila ? mapearPaciente(fila) : null;
  }

  async obtenerPorTelefonoE164(telefonoE164: string): Promise<Paciente | null> {
    const fila = await this.prisma.paciente.findFirst({
      where: { telefonoE164 },
    });
    return fila ? mapearPaciente(fila) : null;
  }

  async listar(filtro: FiltroPacientes = {}): Promise<Paciente[]> {
    const filas = await this.prisma.paciente.findMany({
      where: this.construirWhere(filtro),
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      skip: filtro.desplazamiento,
      take: filtro.limite,
    });
    return filas.map((fila) => mapearPaciente(fila));
  }

  async contar(filtro: FiltroPacientes = {}): Promise<number> {
    return this.prisma.paciente.count({ where: this.construirWhere(filtro) });
  }

  /**
   * Filtro de búsqueda por nombre, apellido o email. Los pacientes archivados
   * quedan fuera salvo que se pidan explícitamente: archivar es una baja
   * lógica, no una marca decorativa.
   */
  private construirWhere(filtro: FiltroPacientes): Prisma.PacienteWhereInput {
    const where: Prisma.PacienteWhereInput = {};
    if (!filtro.incluirArchivados) {
      where.archivadoEn = null;
    }
    const termino = filtro.busqueda?.trim();
    if (termino) {
      where.OR = [
        { nombre: { contains: termino, mode: "insensitive" } },
        { apellido: { contains: termino, mode: "insensitive" } },
        { email: { contains: termino, mode: "insensitive" } },
      ];
    }
    return where;
  }
}

/** Mapea una fila de Prisma a la entidad de dominio Paciente. */
export function mapearPaciente(fila: PacienteFila): Paciente {
  return Paciente.reconstruir({
    id: fila.id,
    nombre: fila.nombre,
    apellido: fila.apellido,
    email: fila.email,
    telefono: fila.telefono,
    telefonoE164: fila.telefonoE164,
    fechaNacimiento: fila.fechaNacimiento,
    sexo: fila.sexo,
    notas: fila.notas,
    archivadoEn: fila.archivadoEn,
    motivoArchivado: fila.motivoArchivado,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
