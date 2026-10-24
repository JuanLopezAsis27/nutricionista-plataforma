import type { ICategoriaAlimentoRepositorio } from "@/dominio/repositorios/ICategoriaAlimentoRepositorio";
import { CategoriasDisponibles } from "@/aplicacion/casos-de-uso/categorias-alimento/CategoriasDisponibles";
import { ListarCategoriasAlimento } from "@/aplicacion/casos-de-uso/categorias-alimento/ListarCategoriasAlimento";
import { CrearCategoriaAlimento } from "@/aplicacion/casos-de-uso/categorias-alimento/CrearCategoriaAlimento";
import { RenombrarCategoriaAlimento } from "@/aplicacion/casos-de-uso/categorias-alimento/RenombrarCategoriaAlimento";
import { EliminarCategoriaAlimento } from "@/aplicacion/casos-de-uso/categorias-alimento/EliminarCategoriaAlimento";
import { MoverCategoriaAlimento } from "@/aplicacion/casos-de-uso/categorias-alimento/MoverCategoriaAlimento";
import { ServicioCategoriasAlimento } from "@/aplicacion/servicios/ServicioCategoriasAlimento";

/**
 * Las categorías que ve cada lista de alimentos (migración 93): un
 * consultorio, las predeterminadas y las suyas; la plataforma, solo las
 * predeterminadas. Es lo que reciben los casos de uso que escriben alimentos.
 */
export function categoriasDeLista(deps: {
  predeterminadas: ICategoriaAlimentoRepositorio;
  propias: ICategoriaAlimentoRepositorio | null;
}): CategoriasDisponibles {
  return new CategoriasDisponibles(
    deps.propias
      ? [deps.predeterminadas, deps.propias]
      : [deps.predeterminadas],
  );
}

/**
 * Las categorías del CONSULTORIO: lista las predeterminadas y las propias,
 * pero crea, renombra y borra solo las propias (una predeterminada no está en
 * la lista que gestiona, y sale como no encontrada).
 */
export function crearServicioCategoriasConsultorio(deps: {
  predeterminadas: ICategoriaAlimentoRepositorio;
  propias: ICategoriaAlimentoRepositorio;
}): ServicioCategoriasAlimento {
  return new ServicioCategoriasAlimento(
    new ListarCategoriasAlimento(categoriasDeLista(deps)),
    new CrearCategoriaAlimento(deps.propias, true, deps.predeterminadas),
    new RenombrarCategoriaAlimento(deps.propias, deps.predeterminadas),
    new EliminarCategoriaAlimento(deps.propias),
  );
}

/** Las PREDETERMINADAS, que administra el SUPERADMIN (con su orden). */
export function crearServicioCategoriasPlataforma(deps: {
  predeterminadas: ICategoriaAlimentoRepositorio;
}): ServicioCategoriasAlimento {
  return new ServicioCategoriasAlimento(
    new ListarCategoriasAlimento(
      categoriasDeLista({
        predeterminadas: deps.predeterminadas,
        propias: null,
      }),
    ),
    new CrearCategoriaAlimento(deps.predeterminadas, false),
    new RenombrarCategoriaAlimento(deps.predeterminadas),
    new EliminarCategoriaAlimento(deps.predeterminadas),
    new MoverCategoriaAlimento(deps.predeterminadas),
  );
}
