import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";
import { ObtenerConfiguracion } from "@/aplicacion/casos-de-uso/configuracion/ObtenerConfiguracion";
import { GuardarConfiguracion } from "@/aplicacion/casos-de-uso/configuracion/GuardarConfiguracion";
import { ObtenerNombreProfesional } from "@/aplicacion/casos-de-uso/configuracion/ObtenerNombreProfesional";
import { CambiarNombreProfesional } from "@/aplicacion/casos-de-uso/configuracion/CambiarNombreProfesional";
import { ServicioConfiguracion } from "@/aplicacion/servicios/ServicioConfiguracion";

/** Arma el servicio de Configuración del consultorio. */
export function crearServicioConfiguracion(deps: {
  configuracion: IConfiguracionRepositorio;
  nutricionistas: INutricionistaRepositorio;
}): ServicioConfiguracion {
  return new ServicioConfiguracion(
    new ObtenerConfiguracion(deps.configuracion),
    new GuardarConfiguracion(deps.configuracion),
    new ObtenerNombreProfesional(deps.nutricionistas),
    new CambiarNombreProfesional(deps.nutricionistas),
  );
}
