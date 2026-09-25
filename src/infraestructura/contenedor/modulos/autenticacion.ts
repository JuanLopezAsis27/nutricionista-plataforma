import { VerificarTokenRecuperacion } from "@/aplicacion/casos-de-uso/autenticacion/VerificarTokenRecuperacion";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ITokenRecuperacionRepositorio } from "@/dominio/repositorios/ITokenRecuperacionRepositorio";
import type { ITokenRefrescoRepositorio } from "@/dominio/repositorios/ITokenRefrescoRepositorio";
import type { IGeneradorTokens } from "@/dominio/servicios/IGeneradorTokens";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";
import { SolicitarRecuperacionPassword } from "@/aplicacion/casos-de-uso/autenticacion/SolicitarRecuperacionPassword";
import { RestablecerPassword } from "@/aplicacion/casos-de-uso/autenticacion/RestablecerPassword";
import { EmitirTokenRefresco } from "@/aplicacion/casos-de-uso/autenticacion/EmitirTokenRefresco";
import { RenovarSesion } from "@/aplicacion/casos-de-uso/autenticacion/RenovarSesion";
import { RevocarSesionesPersistentes } from "@/aplicacion/casos-de-uso/autenticacion/RevocarSesionesPersistentes";
import { LimpiarSesionesCaducadas } from "@/aplicacion/casos-de-uso/autenticacion/LimpiarSesionesCaducadas";
import { ServicioAutenticacion } from "@/aplicacion/servicios/ServicioAutenticacion";

/**
 * Arma el servicio de autenticación: recuperación de contraseña y sesiones
 * persistentes (tokens de refresco).
 */
export function crearServicioAutenticacion(deps: {
  usuarios: IUsuarioRepositorio;
  tokens: ITokenRecuperacionRepositorio;
  tokensRefresco: ITokenRefrescoRepositorio;
  generador: IGeneradorTokens;
  hasheador: IHasheadorContrasena;
  servicioEmail: IServicioEmail;
  reloj: IRelojFecha;
  baseUrl: string;
  nutricionistas: INutricionistaRepositorio;
  diasSesionPersistente: number;
}): ServicioAutenticacion {
  return new ServicioAutenticacion(
    new SolicitarRecuperacionPassword(
      deps.usuarios,
      deps.tokens,
      deps.generador,
      deps.servicioEmail,
      deps.reloj,
      deps.baseUrl,
      deps.nutricionistas,
    ),
    new RestablecerPassword(
      deps.usuarios,
      deps.tokens,
      deps.generador,
      deps.hasheador,
      deps.reloj,
      deps.tokensRefresco,
    ),
    new EmitirTokenRefresco(
      deps.tokensRefresco,
      deps.generador,
      deps.reloj,
      deps.diasSesionPersistente,
    ),
    new RenovarSesion(
      deps.usuarios,
      deps.tokensRefresco,
      deps.generador,
      deps.reloj,
    ),
    new RevocarSesionesPersistentes(
      deps.tokensRefresco,
      deps.generador,
      deps.reloj,
    ),
    // El margen es la misma validez de la sesión: un token vencido hace menos
    // que eso todavía puede delatar un robo si alguien lo vuelve a presentar.
    new LimpiarSesionesCaducadas(
      deps.tokensRefresco,
      deps.reloj,
      deps.diasSesionPersistente,
    ),
    new VerificarTokenRecuperacion(
      deps.usuarios,
      deps.tokens,
      deps.generador,
      deps.reloj,
    ),
  );
}
