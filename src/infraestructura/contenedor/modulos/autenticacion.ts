import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ITokenRecuperacionRepositorio } from "@/dominio/repositorios/ITokenRecuperacionRepositorio";
import type { IGeneradorTokens } from "@/dominio/servicios/IGeneradorTokens";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import { SolicitarRecuperacionPassword } from "@/aplicacion/casos-de-uso/autenticacion/SolicitarRecuperacionPassword";
import { RestablecerPassword } from "@/aplicacion/casos-de-uso/autenticacion/RestablecerPassword";
import { ServicioAutenticacion } from "@/aplicacion/servicios/ServicioAutenticacion";

/** Arma el servicio de autenticación (recuperación de contraseña). */
export function crearServicioAutenticacion(deps: {
  usuarios: IUsuarioRepositorio;
  tokens: ITokenRecuperacionRepositorio;
  generador: IGeneradorTokens;
  hasheador: IHasheadorContrasena;
  servicioEmail: IServicioEmail;
  reloj: IRelojFecha;
  baseUrl: string;
  nombreProfesional: string;
}): ServicioAutenticacion {
  return new ServicioAutenticacion(
    new SolicitarRecuperacionPassword(
      deps.usuarios,
      deps.tokens,
      deps.generador,
      deps.servicioEmail,
      deps.reloj,
      deps.baseUrl,
      deps.nombreProfesional,
    ),
    new RestablecerPassword(
      deps.usuarios,
      deps.tokens,
      deps.generador,
      deps.hasheador,
      deps.reloj,
    ),
  );
}
