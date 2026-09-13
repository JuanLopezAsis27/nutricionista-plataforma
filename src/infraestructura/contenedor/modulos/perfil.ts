import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import type { ITokenRefrescoRepositorio } from "@/dominio/repositorios/ITokenRefrescoRepositorio";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import { ObtenerMiPerfil } from "@/aplicacion/casos-de-uso/perfil/ObtenerMiPerfil";
import { CambiarFotoPerfil } from "@/aplicacion/casos-de-uso/perfil/CambiarFotoPerfil";
import { CambiarPassword } from "@/aplicacion/casos-de-uso/perfil/CambiarPassword";
import { ServicioPerfil } from "@/aplicacion/servicios/ServicioPerfil";

/** Arma el servicio de "Mi perfil" (foto y contraseña de la cuenta propia). */
export function crearServicioPerfil(deps: {
  usuarios: IUsuarioRepositorio;
  pacientes: IPacienteRepositorio;
  configuracion: IConfiguracionRepositorio;
  archivos: IArchivoRepositorio;
  almacenamiento: IAlmacenamientoArchivos;
  hasheador: IHasheadorContrasena;
  tokensRefresco: ITokenRefrescoRepositorio;
  reloj: IRelojFecha;
}): ServicioPerfil {
  return new ServicioPerfil(
    new ObtenerMiPerfil(deps.usuarios, deps.pacientes, deps.configuracion),
    new CambiarFotoPerfil(deps.usuarios, deps.archivos, deps.almacenamiento),
    new CambiarPassword(
      deps.usuarios,
      deps.hasheador,
      deps.tokensRefresco,
      deps.reloj,
    ),
  );
}
