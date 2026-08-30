import type { DelegadoPrisma } from "./DelegadoPrisma";

/**
 * Base de los repositorios Prisma: SOLO lo que es idéntico en todos.
 *
 * ## Qué incluye y qué no
 *
 * `obtenerPorId` y `eliminar` estaban escritos carácter por carácter igual en
 * más de veinte repositorios. `crear` y `actualizar` NO están, y la ausencia es
 * deliberada: cada agregado enumera sus propios campos, y generalizarlos pediría
 * renunciar al tipado de Prisma —que es la principal defensa de este proyecto
 * contra los bugs de persistencia—. La auditoría de calidad (§4.1) lo midió: de
 * las 97 líneas de un repositorio típico, lo genérico son 8.
 *
 * `mapear` queda abstracto: es lo único que cada subclase DEBE aportar, y es
 * específico por definición (casts de enum, `reconstruir()` de su entidad).
 *
 * ## Cuándo NO heredar de acá
 *
 * **1. Si el borrado no es un borrado.** Si un repositorio tuviera que
 * sobrescribir `eliminar` para contradecirlo —borrado lógico, borrado en
 * cascada dentro de una transacción— entonces no pertenece a esta jerarquía.
 * Es la prueba de Liskov en su forma práctica. `PrismaRepositorioPlan` y
 * `PrismaRepositorioPaciente` son ese caso: su flujo real es archivar.
 *
 * **2. Si el agregado se trae con `include`.** `Laboratorio` (con sus
 * adjuntos), `MaterialBiblioteca` (con su archivo) y `Objetivo` (con sus
 * estrategias) mapean desde una fila que incluye relaciones. El `findUnique`
 * de esta base devuelve la fila pelada, así que su `obtenerPorId` tiene que
 * pedir el `include` y no puede heredarse.
 *
 * No es una limitación a resolver: es la señal de que un agregado con hijos
 * necesita decidir en cada consulta qué trae, y esa decisión no se puede
 * generalizar sin volver la base más complicada que los ocho métodos que
 * ahorra.
 */
export abstract class RepositorioPrismaBase<Fila, Entidad> {
  protected constructor(protected readonly delegado: DelegadoPrisma<Fila>) {}

  /** Fila de la base → entidad del dominio. Único método obligatorio. */
  protected abstract mapear(fila: Fila): Entidad;

  async obtenerPorId(id: string): Promise<Entidad | null> {
    const fila = await this.delegado.findUnique({ where: { id } });
    return fila ? this.mapear(fila) : null;
  }

  async eliminar(id: string): Promise<void> {
    await this.delegado.delete({ where: { id } });
  }

  /** Mapea una lista completa. Evita repetir `.map((f) => this.mapear(f))`. */
  protected mapearTodas(filas: Fila[]): Entidad[] {
    return filas.map((fila) => this.mapear(fila));
  }
}
