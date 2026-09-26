import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ICuentaPacienteRepositorio } from "@/dominio/repositorios/ICuentaPacienteRepositorio";
import type { IInvitacionPortalRepositorio } from "@/dominio/repositorios/IInvitacionPortalRepositorio";
import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";
import type { ITokenRefrescoRepositorio } from "@/dominio/repositorios/ITokenRefrescoRepositorio";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import type { IGeneradorContrasenas } from "@/dominio/servicios/IGeneradorContrasenas";
import type { IGeneradorCodigoInvitacion } from "@/dominio/servicios/IGeneradorCodigoInvitacion";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import { DarAccesoPortal } from "@/aplicacion/casos-de-uso/acceso-portal/DarAccesoPortal";
import { GenerarInvitacionPortal } from "@/aplicacion/casos-de-uso/acceso-portal/GenerarInvitacionPortal";
import { CanjearInvitacionPortal } from "@/aplicacion/casos-de-uso/acceso-portal/CanjearInvitacionPortal";
import { ObtenerAccesoPortal } from "@/aplicacion/casos-de-uso/acceso-portal/ObtenerAccesoPortal";
import { RestablecerPasswordPaciente } from "@/aplicacion/casos-de-uso/acceso-portal/RestablecerPasswordPaciente";
import { SugerirNombreUsuario } from "@/aplicacion/casos-de-uso/acceso-portal/SugerirNombreUsuario";
import { CambiarUsuarioPaciente } from "@/aplicacion/casos-de-uso/acceso-portal/CambiarUsuarioPaciente";
import { RevisarEmailPaciente } from "@/aplicacion/casos-de-uso/acceso-portal/RevisarEmailPaciente";
import { ServicioAccesoPortal } from "@/aplicacion/servicios/ServicioAccesoPortal";

/** Dependencias del acceso al portal (compartidas con el alta de pacientes). */
export interface DependenciasAccesoPortal {
  pacientes: IPacienteRepositorio;
  usuarios: IUsuarioRepositorio;
  cuentas: ICuentaPacienteRepositorio;
  invitaciones: IInvitacionPortalRepositorio;
  nutricionistas: INutricionistaRepositorio;
  tokensRefresco: ITokenRefrescoRepositorio;
  hasheador: IHasheadorContrasena;
  generadorContrasenas: IGeneradorContrasenas;
  generadorCodigos: IGeneradorCodigoInvitacion;
  servicioEmail: IServicioEmail;
  reloj: IRelojFecha;
  /** El enlace del email de invitación usa la URL pública de la app. */
  baseUrl: string;
}

export function crearDarAccesoPortal(
  deps: DependenciasAccesoPortal,
): DarAccesoPortal {
  return new DarAccesoPortal(
    deps.pacientes,
    deps.usuarios,
    deps.cuentas,
    deps.hasheador,
  );
}

export function crearGenerarInvitacionPortal(
  deps: DependenciasAccesoPortal,
): GenerarInvitacionPortal {
  return new GenerarInvitacionPortal(
    deps.pacientes,
    deps.usuarios,
    deps.cuentas,
    deps.invitaciones,
    deps.generadorCodigos,
    deps.servicioEmail,
    deps.nutricionistas,
    deps.reloj,
    deps.baseUrl,
  );
}

/** Arma el servicio del acceso al portal con sus casos de uso. */
export function crearServicioAccesoPortal(
  deps: DependenciasAccesoPortal,
): ServicioAccesoPortal {
  return new ServicioAccesoPortal(
    new ObtenerAccesoPortal(
      deps.pacientes,
      deps.usuarios,
      deps.cuentas,
      deps.invitaciones,
      deps.reloj,
    ),
    crearDarAccesoPortal(deps),
    crearGenerarInvitacionPortal(deps),
    new CanjearInvitacionPortal(
      deps.invitaciones,
      deps.generadorCodigos,
      deps.pacientes,
      deps.usuarios,
      deps.cuentas,
      deps.nutricionistas,
      deps.reloj,
    ),
    new RestablecerPasswordPaciente(
      deps.usuarios,
      deps.cuentas,
      deps.hasheador,
      deps.generadorContrasenas,
      deps.tokensRefresco,
      deps.reloj,
    ),
    new SugerirNombreUsuario(deps.usuarios),
    new CambiarUsuarioPaciente(deps.usuarios, deps.cuentas),
    new RevisarEmailPaciente(deps.pacientes, deps.usuarios, deps.cuentas),
  );
}
