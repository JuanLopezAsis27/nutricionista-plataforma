import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { Receta } from "@/dominio/entidades/Receta";

/**
 * Aplica la portada elegida en el mismo guardado, si se eligió una.
 *
 * Va DESPUÉS de persistir y no antes: la entidad valida que la foto sea de
 * esta receta (`marcarFotoPrincipal`), y las fotos se vinculan recién en el
 * `crear`/`actualizar` del repositorio. Una receta nueva nace con `fotos: []`,
 * así que elegir portada antes de guardar siempre habría fallado.
 *
 * Son dos escrituras y no una a propósito: la alternativa era que el
 * repositorio recibiera la portada junto con los archivoIds, lo que le pediría
 * a la capa de infraestructura sostener un invariante —"la portada es una de
 * las fotos"— que es de la entidad.
 *
 * `undefined` no toca nada. No se acepta `null` acá: volver al automático es
 * un cambio deliberado sobre una receta que ya existe, y para eso está
 * `MarcarFotoPrincipal`.
 */
export async function marcarPortada(
  recetas: IRecetaRepositorio,
  receta: Receta,
  fotoPrincipalId: string | undefined,
): Promise<Receta> {
  if (fotoPrincipalId === undefined) return receta;
  return recetas.actualizar(receta.marcarFotoPrincipal(fotoPrincipalId), []);
}
