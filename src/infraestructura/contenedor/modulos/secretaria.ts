import type { IPlantillaEmailRepositorio } from "@/dominio/repositorios/IPlantillaEmailRepositorio";
import type { IEmailEnviadoRepositorio } from "@/dominio/repositorios/IEmailEnviadoRepositorio";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import { ListarPlantillas } from "@/aplicacion/casos-de-uso/secretaria/ListarPlantillas";
import { ObtenerPlantilla } from "@/aplicacion/casos-de-uso/secretaria/ObtenerPlantilla";
import { CrearPlantilla } from "@/aplicacion/casos-de-uso/secretaria/CrearPlantilla";
import { ActualizarPlantilla } from "@/aplicacion/casos-de-uso/secretaria/ActualizarPlantilla";
import { EliminarPlantilla } from "@/aplicacion/casos-de-uso/secretaria/EliminarPlantilla";
import { EnviarEmailDePrueba } from "@/aplicacion/casos-de-uso/secretaria/EnviarEmailDePrueba";
import { ListarEmailsEnviados } from "@/aplicacion/casos-de-uso/secretaria/ListarEmailsEnviados";
import { ServicioSecretaria } from "@/aplicacion/servicios/ServicioSecretaria";

/** Arma el servicio de Secretaría (plantillas de email + envíos de prueba). */
export function crearServicioSecretaria(deps: {
  plantillas: IPlantillaEmailRepositorio;
  emails: IEmailEnviadoRepositorio;
  servicioEmail: IServicioEmail;
  reloj: IRelojFecha;
  nombreProfesional: string;
}): ServicioSecretaria {
  return new ServicioSecretaria(
    new ListarPlantillas(deps.plantillas),
    new ObtenerPlantilla(deps.plantillas),
    new CrearPlantilla(deps.plantillas),
    new ActualizarPlantilla(deps.plantillas),
    new EliminarPlantilla(deps.plantillas),
    new EnviarEmailDePrueba(
      deps.plantillas,
      deps.emails,
      deps.servicioEmail,
      deps.reloj,
      deps.nombreProfesional,
    ),
    new ListarEmailsEnviados(deps.emails),
  );
}
