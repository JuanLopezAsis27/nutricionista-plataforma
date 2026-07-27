import type { IPlantillaEmailRepositorio } from "@/dominio/repositorios/IPlantillaEmailRepositorio";
import type { IEmailEnviadoRepositorio } from "@/dominio/repositorios/IEmailEnviadoRepositorio";
import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import { ListarPlantillas } from "@/dominio/casos-de-uso/secretaria/ListarPlantillas";
import { ObtenerPlantilla } from "@/dominio/casos-de-uso/secretaria/ObtenerPlantilla";
import { CrearPlantilla } from "@/dominio/casos-de-uso/secretaria/CrearPlantilla";
import { ActualizarPlantilla } from "@/dominio/casos-de-uso/secretaria/ActualizarPlantilla";
import { EliminarPlantilla } from "@/dominio/casos-de-uso/secretaria/EliminarPlantilla";
import { EnviarEmailDePrueba } from "@/dominio/casos-de-uso/secretaria/EnviarEmailDePrueba";
import { EnviarRecordatoriosDeTurnos } from "@/dominio/casos-de-uso/secretaria/EnviarRecordatoriosDeTurnos";
import { ListarEmailsEnviados } from "@/dominio/casos-de-uso/secretaria/ListarEmailsEnviados";
import { ServicioSecretaria } from "@/aplicacion/servicios/ServicioSecretaria";

/** Arma el servicio de Secretaría (plantillas + recordatorios + envíos). */
export function crearServicioSecretaria(deps: {
  plantillas: IPlantillaEmailRepositorio;
  emails: IEmailEnviadoRepositorio;
  turnos: ITurnoRepositorio;
  pacientes: IPacienteRepositorio;
  usuarios: IUsuarioRepositorio;
  servicioEmail: IServicioEmail;
  reloj: IRelojFecha;
  bus: IBusEventos;
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
    new EnviarRecordatoriosDeTurnos(
      deps.plantillas,
      deps.emails,
      deps.turnos,
      deps.pacientes,
      deps.servicioEmail,
      deps.reloj,
      deps.nombreProfesional,
    ),
    new ListarEmailsEnviados(deps.emails),
    deps.usuarios,
    deps.bus,
  );
}
