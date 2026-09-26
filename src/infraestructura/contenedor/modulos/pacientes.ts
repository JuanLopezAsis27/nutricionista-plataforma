import type { INotificacionRepositorio } from "@/dominio/repositorios/INotificacionRepositorio";
import type { IVerificadorDominioEmail } from "@/dominio/servicios/IVerificadorDominioEmail";
import { EmitirNotificacion } from "@/aplicacion/casos-de-uso/notificaciones/EmitirNotificacion";
import type { IGeneradorContrasenas } from "@/dominio/servicios/IGeneradorContrasenas";
import type { ITokenRefrescoRepositorio } from "@/dominio/repositorios/ITokenRefrescoRepositorio";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ICuentaPacienteRepositorio } from "@/dominio/repositorios/ICuentaPacienteRepositorio";
import type { IPlantillaEmailRepositorio } from "@/dominio/repositorios/IPlantillaEmailRepositorio";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { IHistoriaClinicaRepositorio } from "@/dominio/repositorios/IHistoriaClinicaRepositorio";
import type { ICampoHistoriaClinicaRepositorio } from "@/dominio/repositorios/ICampoHistoriaClinicaRepositorio";
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
import { EnviarBienvenidaAlAlta } from "@/aplicacion/casos-de-uso/pacientes/EnviarBienvenidaAlAlta";
import { EnviarBienvenidaMasiva } from "@/aplicacion/casos-de-uso/pacientes/EnviarBienvenidaMasiva";
import { ArchivarPaciente } from "@/aplicacion/casos-de-uso/pacientes/ArchivarPaciente";
import { ReactivarPaciente } from "@/aplicacion/casos-de-uso/pacientes/ReactivarPaciente";
import { InterpretarFichaPaciente } from "@/aplicacion/casos-de-uso/pacientes/InterpretarFichaPaciente";
import { CrearPacienteDesdeFicha } from "@/aplicacion/casos-de-uso/pacientes/CrearPacienteDesdeFicha";
import { ServicioPaciente } from "@/aplicacion/servicios/ServicioPaciente";

/** Arma el servicio de Pacientes con sus casos de uso. */
export function crearServicioPaciente(deps: {
  pacientes: IPacienteRepositorio;
  usuarios: IUsuarioRepositorio;
  /** Una cuenta de paciente puede tener varios consultorios (migración 78). */
  cuentas: ICuentaPacienteRepositorio;
  plantillas: IPlantillaEmailRepositorio;
  hasheador: IHasheadorContrasena;
  /** La bienvenida manual genera una contraseña si la plantilla la pide. */
  generadorContrasenas: IGeneradorContrasenas;
  tokensRefresco: ITokenRefrescoRepositorio;
  reloj: IRelojFecha;
  servicioEmail: IServicioEmail;
  /** El aviso de la campana cuando la bienvenida del alta no sale. */
  notificaciones: INotificacionRepositorio;
  verificadorEmail: IVerificadorDominioEmail;
  configuracion: IConfiguracionRepositorio;
  nutricionistas: INutricionistaRepositorio;
  // El alta desde una ficha escrita crea, además del paciente, los registros
  // que el documento traía: por eso este servicio toca repositorios de
  // evaluación que en el alta manual no necesita.
  historias: IHistoriaClinicaRepositorio;
  camposHistoria: ICampoHistoriaClinicaRepositorio;
  antropometrias: IAntropometriaRepositorio;
  laboratorios: ILaboratorioRepositorio;
  archivos: IArchivoRepositorio;
  interpretadorFicha: IInterpretadorFichaPaciente;
}): ServicioPaciente {
  const crearPaciente = new CrearPaciente(
    deps.pacientes,
    deps.usuarios,
    deps.cuentas,
    deps.hasheador,
    deps.configuracion,
  );

  const enviarEmailDeBienvenida = new EnviarEmailDeBienvenida(
    deps.plantillas,
    deps.servicioEmail,
    deps.nutricionistas,
  );

  return new ServicioPaciente(
    crearPaciente,
    new ObtenerPacientes(deps.pacientes),
    new ObtenerPacientePorId(deps.pacientes),
    new ActualizarPaciente(
      deps.pacientes,
      deps.usuarios,
      deps.cuentas,
      deps.configuracion,
    ),
    new EliminarPaciente(deps.pacientes, deps.usuarios, deps.cuentas),
    new EnviarBienvenidaAlAlta(
      deps.configuracion,
      deps.pacientes,
      enviarEmailDeBienvenida,
      deps.verificadorEmail,
      new EmitirNotificacion(deps.notificaciones, deps.reloj),
    ),
    new EnviarBienvenidaMasiva(
      deps.pacientes,
      enviarEmailDeBienvenida,
      deps.usuarios,
      deps.cuentas,
      deps.hasheador,
      deps.generadorContrasenas,
      deps.tokensRefresco,
      deps.reloj,
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
      deps.antropometrias,
      deps.laboratorios,
      deps.archivos,
    ),
  );
}
