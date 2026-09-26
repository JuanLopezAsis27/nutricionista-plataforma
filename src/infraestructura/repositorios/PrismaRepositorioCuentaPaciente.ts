import type { PrismaClient } from "@prisma/client";
import type {
  ConsultorioDeCuenta,
  ICuentaPacienteRepositorio,
} from "@/dominio/repositorios/ICuentaPacienteRepositorio";
import { ejecutarGlobal } from "@/infraestructura/multitenancy/contextoTenant";

/**
 * Implementación con Prisma de las fichas de una cuenta (`pacientes.usuarioId`,
 * migración 78).
 *
 * `vincular` corre en el consultorio en curso, como cualquier escritura de
 * inquilino: la extensión acota el UPDATE a las fichas de ESE consultorio.
 * Contar y listar corren con alcance GLOBAL a propósito: son las preguntas
 * sobre la cuenta entera, que no es de ningún consultorio. Lo que cruza el
 * límite es un número (contar) o, para la propia persona, sus consultorios con
 * el nombre y la foto del profesional (listar): nunca datos de la ficha.
 */
export class PrismaRepositorioCuentaPaciente implements ICuentaPacienteRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Toca la fila de la ficha y por lo tanto su `actualizadoEn` (el testigo de
   * edición concurrente). Hoy se llama solo en el alta, cuando todavía no hay
   * ningún formulario abierto sobre esa ficha que pueda chocar.
   */
  async vincular(usuarioId: string, pacienteId: string): Promise<void> {
    await this.prisma.paciente.update({
      where: { id: pacienteId },
      data: { usuarioId },
    });
  }

  async contarDeUsuario(usuarioId: string): Promise<number> {
    return ejecutarGlobal(() =>
      this.prisma.paciente.count({ where: { usuarioId } }),
    );
  }

  async listarDeUsuario(usuarioId: string): Promise<ConsultorioDeCuenta[]> {
    return ejecutarGlobal(async () => {
      const filas = await this.prisma.paciente.findMany({
        where: { usuarioId },
        orderBy: { creadoEn: "asc" },
        select: {
          id: true,
          nutricionistaId: true,
          nutricionista: {
            select: {
              nombre: true,
              // La cuenta del profesional: es la que tiene la foto.
              usuarios: {
                where: { rol: "NUTRICIONISTA" },
                select: { fotoPerfilId: true },
                take: 1,
              },
            },
          },
        },
      });
      return filas.map((fila) => ({
        pacienteId: fila.id,
        nutricionistaId: fila.nutricionistaId,
        nombreProfesional: fila.nutricionista.nombre,
        fotoProfesionalId: fila.nutricionista.usuarios[0]?.fotoPerfilId ?? null,
      }));
    });
  }
}
