import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IPlantillaEmailRepositorio } from "@/dominio/repositorios/IPlantillaEmailRepositorio";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { IHistoriaClinicaRepositorio } from "@/dominio/repositorios/IHistoriaClinicaRepositorio";
import type { ICampoHistoriaClinicaRepositorio } from "@/dominio/repositorios/ICampoHistoriaClinicaRepositorio";
import type { IAlertaAlimentariaRepositorio } from "@/dominio/repositorios/IAlertaAlimentariaRepositorio";
import type { IAntropometriaRepositorio } from "@/dominio/repositorios/IAntropometriaRepositorio";
import type { ILaboratorioRepositorio } from "@/dominio/repositorios/ILaboratorioRepositorio";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IInterpretadorFichaPaciente } from "@/dominio/servicios/IInterpretadorFichaPaciente";
import { CrearPaciente } from "@/aplicacion/casos-de-uso/pacientes/CrearPaciente";
import { ObtenerPacientes } from "@/aplicacion/casos-de-uso/pacientes/ObtenerPacientes";
import { ObtenerPacientePorId } from "@/aplicacion/casos-de-uso/pacientes/ObtenerPacientePorId";
import { ActualizarPaciente } from "@/aplicacion/casos-de-uso/pacientes/ActualizarPaciente";
import { EliminarPaciente } from "@/aplicacion/casos-de-uso/pacientes/EliminarPaciente";
import { EnviarEmailDeBienvenida } from "@/aplicacion/casos-de-uso/pacientes/EnviarEmailDeBienvenida";
import { ArchivarPaciente } from "@/aplicacion/casos-de-uso/pacientes/ArchivarPaciente";
import { ReactivarPaciente } from "@/aplicacion/casos-de-uso/pacientes/ReactivarPaciente";
import { InterpretarFichaPaciente } from "@/aplicacion/casos-de-uso/pacientes/InterpretarFichaPaciente";
import { CrearPacienteDesdeFicha } from "@/aplicacion/casos-de-uso/pacientes/CrearPacienteDesdeFicha";
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
  // El alta desde una ficha escrita crea, además del paciente, los registros
  // que el documento traía: por eso este servicio toca repositorios de
  // evaluación que en el alta manual no necesita.
  historias: IHistoriaClinicaRepositorio;
  camposHistoria: ICampoHistoriaClinicaRepositorio;
  alertas: IAlertaAlimentariaRepositorio;
  antropometrias: IAntropometriaRepositorio;
  laboratorios: ILaboratorioRepositorio;
  archivos: IArchivoRepositorio;
  interpretadorFicha: IInterpretadorFichaPaciente;
}): ServicioPaciente {
  const crearPaciente = new CrearPaciente(
    deps.pacientes,
    deps.usuarios,
    deps.hasheador,
    deps.configuracion,
  );

  return new ServicioPaciente(
    crearPaciente,
    new ObtenerPacientes(deps.pacientes),
    new ObtenerPacientePorId(deps.pacientes),
    new ActualizarPaciente(deps.pacientes, deps.usuarios, deps.configuracion),
    new EliminarPaciente(deps.pacientes, deps.usuarios),
    new EnviarEmailDeBienvenida(
      deps.plantillas,
      deps.servicioEmail,
      deps.nombreProfesional,
    ),
    new ArchivarPaciente(deps.pacientes),
    new ReactivarPaciente(deps.pacientes),
    new InterpretarFichaPaciente(
      deps.interpretadorFicha,
      deps.archivos,
      deps.camposHistoria,
    ),
    new CrearPacienteDesdeFicha(
      crearPaciente,
      deps.historias,
      deps.alertas,
      deps.antropometrias,
      deps.laboratorios,
      deps.archivos,
    ),
  );
}
