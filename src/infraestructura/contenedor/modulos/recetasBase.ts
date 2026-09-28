import type { IRecetaBaseRepositorio } from "@/dominio/repositorios/IRecetaBaseRepositorio";
import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import { CrearRecetaBase } from "@/aplicacion/casos-de-uso/catalogo/CrearRecetaBase";
import { ActualizarRecetaBase } from "@/aplicacion/casos-de-uso/catalogo/ActualizarRecetaBase";
import { EliminarRecetaBase } from "@/aplicacion/casos-de-uso/catalogo/EliminarRecetaBase";
import { ObtenerRecetaBase } from "@/aplicacion/casos-de-uso/catalogo/ObtenerRecetaBase";
import { ListarRecetasBase } from "@/aplicacion/casos-de-uso/catalogo/ListarRecetasBase";
import { CopiarRecetaBaseAlRecetario } from "@/aplicacion/casos-de-uso/catalogo/CopiarRecetaBaseAlRecetario";
import { ServicioRecetasBase } from "@/aplicacion/servicios/ServicioRecetasBase";

/** Arma el servicio del catálogo de recetas de la plataforma. */
export function crearServicioRecetasBase(deps: {
  catalogo: IRecetaBaseRepositorio;
  recetario: IRecetaRepositorio;
}): ServicioRecetasBase {
  return new ServicioRecetasBase(
    new CrearRecetaBase(deps.catalogo),
    new ActualizarRecetaBase(deps.catalogo),
    new EliminarRecetaBase(deps.catalogo),
    new ObtenerRecetaBase(deps.catalogo),
    new ListarRecetasBase(deps.catalogo),
    new CopiarRecetaBaseAlRecetario(deps.catalogo, deps.recetario),
  );
}
