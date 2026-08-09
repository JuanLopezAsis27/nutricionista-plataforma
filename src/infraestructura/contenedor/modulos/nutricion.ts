import type { IProveedorDatosNutricionales } from "@/dominio/servicios/IProveedorDatosNutricionales";
import type { ICredencialesIntegracionRepositorio } from "@/dominio/repositorios/ICredencialesIntegracionRepositorio";
import { ServicioNutricion } from "@/aplicacion/servicios/ServicioNutricion";

/** Arma el servicio de datos nutricionales sobre el proveedor externo. */
export function crearServicioNutricion(deps: {
  proveedor: IProveedorDatosNutricionales;
  credenciales: ICredencialesIntegracionRepositorio;
}): ServicioNutricion {
  return new ServicioNutricion(deps.proveedor, deps.credenciales);
}
