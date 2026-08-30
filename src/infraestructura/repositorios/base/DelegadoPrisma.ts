/**
 * Forma mínima de un delegate de Prisma para las operaciones por id.
 *
 * Se declara a mano en vez de usar `any`: los delegates generados por Prisma
 * son estructuralmente compatibles con esta interfaz, así que el tipado de
 * `Fila` se conserva de punta a punta y el único cast del sistema vive en el
 * constructor de cada repositorio, no replicado por cada método.
 *
 * Deliberadamente NO incluye `create` ni `update`: cada agregado enumera sus
 * propios campos y generalizarlos exigiría renunciar al tipado de Prisma, que
 * es justamente lo que evita que un campo mal escrito llegue a producción.
 */
export interface DelegadoPrisma<Fila> {
  findUnique(args: { where: { id: string } }): Promise<Fila | null>;
  delete(args: { where: { id: string } }): Promise<unknown>;
}
