import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IPlantillaEmailRepositorio } from "@/dominio/repositorios/IPlantillaEmailRepositorio";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import { CrearPaciente } from "@/dominio/casos-de-uso/pacientes/CrearPaciente";
import { ObtenerPacientes } from "@/dominio/casos-de-uso/pacientes/ObtenerPacientes";
import { ObtenerPacientePorId } from "@/dominio/casos-de-uso/pacientes/ObtenerPacientePorId";
import { ActualizarPaciente } from "@/dominio/casos-de-uso/pacientes/ActualizarPaciente";
import { EliminarPaciente } from "@/dominio/casos-de-uso/pacientes/EliminarPaciente";
import { EnviarEmailDeBienvenida } from "@/dominio/casos-de-uso/pacientes/EnviarEmailDeBienvenida";
import { ServicioPaciente } from "@/aplicacion/servicios/ServicioPaciente";

/** Arma el servicio de Pacientes con sus casos de uso. */
export function crearServicioPaciente(deps: {
  pacientes: IPacienteRepositorio;
  usuarios: IUsuarioRepositorio;
  plantillas: IPlantillaEmailRepositorio;
  hasheador: IHasheadorContrasena;
  servicioEmail: IServicioEmail;
  nombreProfesional: string;
}): ServicioPaciente {
  return new ServicioPaciente(
    new CrearPaciente(deps.pacientes, deps.usuarios, deps.hasheador),
    new ObtenerPacientes(deps.pacientes),
    new ObtenerPacientePorId(deps.pacientes),
    new ActualizarPaciente(deps.pacientes, deps.usuarios),
    new EliminarPaciente(deps.pacientes, deps.usuarios),
    new EnviarEmailDeBienvenida(deps.plantillas, deps.servicioEmail, deps.nombreProfesional),
  );
}
