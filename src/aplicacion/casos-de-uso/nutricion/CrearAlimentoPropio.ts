import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import {
  AlimentoPropio,
  type DatosNuevoAlimentoPropio,
} from "@/dominio/entidades/AlimentoPropio";
import { ErrorAlimentoDuplicado } from "@/dominio/errores/ErrorAlimentoDuplicado";

/**
 * Caso de uso: alta manual de un alimento (uno por uno, sin planilla). Sirve a
 * la lista del consultorio y al catálogo de la plataforma.
 *
 * No deja cargar dos veces el mismo alimento (`claveIdentidad`: nombre y
 * marca, sin mayúsculas, tildes ni espacios de más). El índice único de la
 * base es la garantía dura; este chequeo es el que puede decir CUÁL ya está.
 */
export class CrearAlimentoPropio {
  constructor(private readonly repositorio: IAlimentoPropioRepositorio) {}

  async ejecutar(datos: DatosNuevoAlimentoPropio): Promise<AlimentoPropio> {
    const alimento = AlimentoPropio.crear(datos, crypto.randomUUID());
    const existente = await this.repositorio.obtenerPorClave(
      alimento.claveIdentidad,
    );
    if (existente) throw new ErrorAlimentoDuplicado(existente.etiqueta);
    return this.repositorio.crear(alimento);
  }
}
