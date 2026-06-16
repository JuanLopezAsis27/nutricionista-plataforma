import type { PrismaClient, Paciente as PacienteFila, Prisma } from "@prisma/client";
import type {
  IPacienteRepositorio,
  FiltroPacientes,
} from "@/dominio/repositorios/IPacienteRepositorio";
import { Paciente } from "@/dominio/entidades/Paciente";

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
        nombre: datos.nombre,
        apellido: datos.apellido,
        email: datos.email,
        telefono: datos.telefono,
        fechaNacimiento: datos.fechaNacimiento,
        notas: datos.notas,
        creadoEn: datos.creadoEn,
        actualizadoEn: datos.actualizadoEn,
      },
    });
    return this.mapearAPaciente(fila);
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
        fechaNacimiento: datos.fechaNacimiento,
        notas: datos.notas,
        actualizadoEn: datos.actualizadoEn,
      },
    });
    return this.mapearAPaciente(fila);
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.paciente.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<Paciente | null> {
    const fila = await this.prisma.paciente.findUnique({ where: { id } });
    return fila ? this.mapearAPaciente(fila) : null;
  }

  async obtenerPorEmail(email: string): Promise<Paciente | null> {
    const fila = await this.prisma.paciente.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    return fila ? this.mapearAPaciente(fila) : null;
  }

  async listar(filtro: FiltroPacientes = {}): Promise<Paciente[]> {
    const filas = await this.prisma.paciente.findMany({
      where: this.construirWhere(filtro.busqueda),
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      skip: filtro.desplazamiento,
      take: filtro.limite,
    });
    return filas.map((fila) => this.mapearAPaciente(fila));
  }

  async contar(filtro: FiltroPacientes = {}): Promise<number> {
    return this.prisma.paciente.count({ where: this.construirWhere(filtro.busqueda) });
  }

  /** Construye el filtro de búsqueda por nombre, apellido o email. */
  private construirWhere(busqueda?: string): Prisma.PacienteWhereInput {
    if (!busqueda || busqueda.trim().length === 0) {
      return {};
    }
    const termino = busqueda.trim();
    return {
      OR: [
        { nombre: { contains: termino, mode: "insensitive" } },
        { apellido: { contains: termino, mode: "insensitive" } },
        { email: { contains: termino, mode: "insensitive" } },
      ],
    };
  }

  /** Mapea una fila de Prisma a la entidad de dominio Paciente. */
  private mapearAPaciente(fila: PacienteFila): Paciente {
    return Paciente.reconstruir({
      id: fila.id,
      nombre: fila.nombre,
      apellido: fila.apellido,
      email: fila.email,
      telefono: fila.telefono,
      fechaNacimiento: fila.fechaNacimiento,
      notas: fila.notas,
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  }
}
