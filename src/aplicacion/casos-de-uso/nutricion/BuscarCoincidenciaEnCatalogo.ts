import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import {
  claveIdentidadAlimento,
  type AlimentoPropio,
} from "@/dominio/entidades/AlimentoPropio";

/**
 * Caso de uso: si un alimento que el profesional está por cargar en SU lista
 * ya existe en el catálogo de la plataforma (misma `claveIdentidad`).
 *
 * No es un error: tener una versión propia con otros macros es legítimo, y en
 * el buscador del consultorio la suya reemplaza a la de la plataforma. Es un
 * AVISO, para que no cargue una copia idéntica sin darse cuenta.
 */
export class BuscarCoincidenciaEnCatalogo {
  constructor(private readonly catalogo: IAlimentoPropioRepositorio) {}

  ejecutar(
    nombre: string,
    marca: string | null,
  ): Promise<AlimentoPropio | null> {
    if (nombre.trim().length === 0) return Promise.resolve(null);
    return this.catalogo.obtenerPorClave(claveIdentidadAlimento(nombre, marca));
  }
}
