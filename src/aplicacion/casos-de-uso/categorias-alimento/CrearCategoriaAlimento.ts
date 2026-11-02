import type { ICategoriaAlimentoRepositorio } from "@/dominio/repositorios/ICategoriaAlimentoRepositorio";
import { CategoriaAlimento } from "@/dominio/entidades/CategoriaAlimento";
import { ErrorCategoriaAlimentoDuplicada } from "@/dominio/errores/ErrorCategoriaAlimentoDuplicada";

/**
 * Caso de uso: crear una categoría de alimento. Sirve a las PROPIAS de un
 * consultorio y a las PREDETERMINADAS de la plataforma (las del SUPERADMIN).
 *
 * Una propia no puede llamarse como una predeterminada: el consultorio ve las
 * dos juntas en el buscador, y dos filtros «Geles» no se distinguen. Una
 * predeterminada nueva va al final de la lista.
 */
export class CrearCategoriaAlimento {
  constructor(
    private readonly lista: ICategoriaAlimentoRepositorio,
    private readonly propia: boolean,
    /** Con una lista propia: las predeterminadas, para no repetirlas. */
    private readonly predeterminadas: ICategoriaAlimentoRepositorio | null = null,
  ) {}

  async ejecutar(nombre: string): Promise<CategoriaAlimento> {
    const orden = this.propia
      ? 0
      : Math.max(0, ...(await this.lista.listar()).map((c) => c.orden)) + 1;
    const categoria = CategoriaAlimento.crear(
      { nombre, orden },
      this.propia,
      crypto.randomUUID(),
    );
    await verificarNombreLibre(categoria, this.lista, this.predeterminadas);
    return this.lista.crear(categoria);
  }
}

/**
 * El índice único es la garantía dura; esto da el mensaje entendible, y
 * además mira la otra lista, que el índice no puede ver.
 */
export async function verificarNombreLibre(
  categoria: CategoriaAlimento,
  lista: ICategoriaAlimentoRepositorio,
  predeterminadas: ICategoriaAlimentoRepositorio | null,
): Promise<void> {
  if (await lista.existeNombre(categoria.claveNombre, categoria.id)) {
    throw new ErrorCategoriaAlimentoDuplicada(categoria.nombre);
  }
  if (
    predeterminadas &&
    (await predeterminadas.existeNombre(categoria.claveNombre))
  ) {
    throw new ErrorCategoriaAlimentoDuplicada(categoria.nombre, true);
  }
}
