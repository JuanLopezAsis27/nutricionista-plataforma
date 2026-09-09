import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import type { IProvisionadorNutricionista } from "@/dominio/servicios/IProvisionadorNutricionista";
import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";
import { CrearCuentaNutricionista } from "@/aplicacion/casos-de-uso/superadmin/CrearCuentaNutricionista";
import { ListarNutricionistas } from "@/aplicacion/casos-de-uso/superadmin/ListarNutricionistas";
import { CambiarEstadoNutricionista } from "@/aplicacion/casos-de-uso/superadmin/CambiarEstadoNutricionista";
import { ServicioSuperAdmin } from "@/aplicacion/servicios/ServicioSuperAdmin";

/** Arma el servicio del SuperAdmin (gestión de cuentas de nutricionista). */
export function crearServicioSuperAdmin(deps: {
  usuarios: IUsuarioRepositorio;
  hasheador: IHasheadorContrasena;
  provisionador: IProvisionadorNutricionista;
  nutricionistas: INutricionistaRepositorio;
}): ServicioSuperAdmin {
  return new ServicioSuperAdmin(
    new CrearCuentaNutricionista(
      deps.usuarios,
      deps.hasheador,
      deps.provisionador,
      deps.nutricionistas,
    ),
    new ListarNutricionistas(deps.usuarios),
    new CambiarEstadoNutricionista(deps.usuarios),
  );
}
