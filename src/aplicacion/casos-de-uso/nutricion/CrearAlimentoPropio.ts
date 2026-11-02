import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import {
  AlimentoPropio,
  type DatosNuevoAlimentoPropio,
} from "@/dominio/entidades/AlimentoPropio";
import { ErrorAlimentoDuplicado } from "@/dominio/errores/ErrorAlimentoDuplicado";
import type { CategoriasDisponibles } from "../categorias-alimento/CategoriasDisponibles";

/**
 * Lo que llega del formulario: la categoría viene por id (migración 93) y la
 * resuelve el caso de uso contra las categorías de la lista.
 */
export interface DatosAltaAlimento extends Omit<
  DatosNuevoAlimentoPropio,
  "categoria"
> {
  categoriaId?: string | null;
}

/**
 * Caso de uso: alta manual de un alimento (uno por uno, sin planilla). Sirve a
 * la lista del consultorio y al catálogo de la plataforma.
 *
 * No deja cargar dos veces el mismo alimento (`claveIdentidad`: nombre y
 * marca, sin mayúsculas, tildes ni espacios de más). El índice único de la
 * base es la garantía dura; este chequeo es el que puede decir CUÁL ya está.
 *
 * La categoría tiene que ser una de las que ve la lista: en un consultorio,
 * predeterminada o propia; en la plataforma, solo predeterminada.
 */
export class CrearAlimentoPropio {
  constructor(
    private readonly repositorio: IAlimentoPropioRepositorio,
    private readonly categorias: CategoriasDisponibles | null = null,
  ) {}

  async ejecutar(datos: DatosAltaAlimento): Promise<AlimentoPropio> {
    const { categoriaId, ...resto } = datos;
    const categoria = this.categorias
      ? await this.categorias.resolver(categoriaId ?? null)
      : null;
    const alimento = AlimentoPropio.crear(
      { ...resto, categoria: categoria ?? null },
      crypto.randomUUID(),
    );
    const existente = await this.repositorio.obtenerPorClave(
      alimento.claveIdentidad,
    );
    if (existente) throw new ErrorAlimentoDuplicado(existente.etiqueta);
    return this.repositorio.crear(alimento);
  }
}
