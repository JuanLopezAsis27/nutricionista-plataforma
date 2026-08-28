import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IPlantillaEmailRepositorio } from "@/dominio/repositorios/IPlantillaEmailRepositorio";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import { CrearPaciente } from "@/dominio/casos-de-uso/pacientes/CrearPaciente";
import { ObtenerPacientes } from "@/dominio/casos-de-uso/pacientes/ObtenerPacientes";
import { ObtenerPacientePorId } from "@/dominio/casos-de-uso/pacientes/ObtenerPacientePorId";
import { ActualizarPaciente } from "@/dominio/casos-de-uso/pacientes/ActualizarPaciente";
import { EliminarPaciente } from "@/dominio/casos-de-uso/pacientes/EliminarPaciente";
import { EnviarEmailDeBienvenida } from "@/dominio/casos-de-uso/pacientes/EnviarEmailDeBienvenida";
import { ArchivarPaciente } from "@/dominio/casos-de-uso/pacientes/ArchivarPaciente";
import { ReactivarPaciente } from "@/dominio/casos-de-uso/pacientes/ReactivarPaciente";
import { ServicioPaciente } from "@/aplicacion/servicios/ServicioPaciente";

/** Arma el servicio de Pacientes con sus casos de uso. */
export function crearServicioPaciente(deps: {
  pacientes: IPacienteRepositorio;
  usuarios: IUsuarioRepositorio;
  plantillas: IPlantillaEmailRepositorio;
  hasheador: IHasheadorContrasena;
  servicioEmail: IServicioEmail;
  configuracion: IConfiguracionRepositorio;
  nombreProfesional: string;
}): ServicioPaciente {
  return new ServicioPaciente(
    new CrearPaciente(deps.pacientes, deps.usuarios, deps.hasheador, deps.configuracion),
    new ObtenerPacientes(deps.pacientes),
    new ObtenerPacientePorId(deps.pacientes),
    new ActualizarPaciente(deps.pacientes, deps.usuarios, deps.configuracion),
    new EliminarPaciente(deps.pacientes, deps.usuarios),
    new EnviarEmailDeBienvenida(deps.plantillas, deps.servicioEmail, deps.nombreProfesional),
    new ArchivarPaciente(deps.pacientes),
    new ReactivarPaciente(deps.pacientes),
  );
}
