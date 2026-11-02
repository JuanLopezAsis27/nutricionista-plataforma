import type { ICategoriaAlimentoRepositorio } from "@/dominio/repositorios/ICategoriaAlimentoRepositorio";
import { ErrorCategoriaAlimentoNoEncontrada } from "@/dominio/errores/ErrorCategoriaAlimentoNoEncontrada";

export type DireccionCategoria = "ARRIBA" | "ABAJO";

/**
 * Caso de uso: subir o bajar una categoría PREDETERMINADA en la lista. El
 * orden es el de los filtros del buscador, y es semántico: «Embutidos» va
 * junto a «Carnes», no donde la deje el abecedario.
 *
 * Renumera la lista entera (1, 2, 3…) en vez de intercambiar dos números: las
 * que vinieron con el mismo orden quedarían empatadas para siempre.
 */
export class MoverCategoriaAlimento {
  constructor(private readonly lista: ICategoriaAlimentoRepositorio) {}

  async ejecutar(id: string, direccion: DireccionCategoria): Promise<void> {
    const categorias = await this.lista.listar();
    const indice = categorias.findIndex((c) => c.id === id);
    if (indice < 0) throw new ErrorCategoriaAlimentoNoEncontrada(id);
    const destino = direccion === "ARRIBA" ? indice - 1 : indice + 1;
    if (destino < 0 || destino >= categorias.length) return;

    const reordenadas = [...categorias];
    const [movida] = reordenadas.splice(indice, 1);
    if (!movida) return;
    reordenadas.splice(destino, 0, movida);
    await Promise.all(
      reordenadas
        .map((categoria, i) => ({ categoria, orden: i + 1 }))
        .filter(({ categoria, orden }) => categoria.orden !== orden)
        .map(({ categoria, orden }) =>
          this.lista.actualizar(categoria.conOrden(orden)),
        ),
    );
  }
}
