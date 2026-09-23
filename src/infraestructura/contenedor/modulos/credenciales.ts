import type { ICredencialesIntegracionRepositorio } from "@/dominio/repositorios/ICredencialesIntegracionRepositorio";
import type { IConfiguracionIAGlobalRepositorio } from "@/dominio/repositorios/IConfiguracionIAGlobalRepositorio";
import type { IRegistroUsoIARepositorio } from "@/dominio/repositorios/IRegistroUsoIARepositorio";
import type { IConsultorSaldoIA } from "@/dominio/servicios/IConsultorSaldoIA";
import {
  ServicioCredenciales,
  type DisponibilidadIA,
} from "@/aplicacion/servicios/ServicioCredenciales";
import { ServicioIAPlataforma } from "@/aplicacion/servicios/ServicioIAPlataforma";

/** Arma el servicio de credenciales de integración del profesional. */
export function crearServicioCredenciales(deps: {
  credenciales: ICredencialesIntegracionRepositorio;
  disponibilidadIA: () => Promise<DisponibilidadIA>;
}): ServicioCredenciales {
  return new ServicioCredenciales(deps.credenciales, deps.disponibilidadIA);
}

/** Arma el servicio de la IA de la plataforma (panel del SUPERADMIN). */
export function crearServicioIAPlataforma(deps: {
  configuracion: IConfiguracionIAGlobalRepositorio;
  registro: IRegistroUsoIARepositorio;
  saldo: IConsultorSaldoIA;
}): ServicioIAPlataforma {
  return new ServicioIAPlataforma(
    deps.configuracion,
    deps.registro,
    deps.saldo,
  );
}
