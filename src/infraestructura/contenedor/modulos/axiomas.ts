import type { IAxiomaRepositorio } from "@/dominio/repositorios/IAxiomaRepositorio";
import { CrearAxioma } from "@/dominio/casos-de-uso/axiomas/CrearAxioma";
import { ActualizarAxioma } from "@/dominio/casos-de-uso/axiomas/ActualizarAxioma";
import { EliminarAxioma } from "@/dominio/casos-de-uso/axiomas/EliminarAxioma";
import { ListarAxiomas } from "@/dominio/casos-de-uso/axiomas/ListarAxiomas";
import { ListarAxiomasActivos } from "@/dominio/casos-de-uso/axiomas/ListarAxiomasActivos";
import { ServicioAxiomas } from "@/aplicacion/servicios/ServicioAxiomas";

/** Arma el servicio de la Base de conocimiento (axiomas). */
export function crearServicioAxiomas(deps: {
  axiomas: IAxiomaRepositorio;
}): ServicioAxiomas {
  return new ServicioAxiomas(
    new CrearAxioma(deps.axiomas),
    new ActualizarAxioma(deps.axiomas),
    new EliminarAxioma(deps.axiomas),
    new ListarAxiomas(deps.axiomas),
    new ListarAxiomasActivos(deps.axiomas),
  );
}
