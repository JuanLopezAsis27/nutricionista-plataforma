import type { IMensajeriaRepositorio } from "@/dominio/repositorios/IMensajeriaRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import { EnviarMensaje } from "@/dominio/casos-de-uso/mensajeria/EnviarMensaje";
import { ObtenerConversacionDePaciente } from "@/dominio/casos-de-uso/mensajeria/ObtenerConversacionDePaciente";
import { ListarMensajes } from "@/dominio/casos-de-uso/mensajeria/ListarMensajes";
import { ListarConversaciones } from "@/dominio/casos-de-uso/mensajeria/ListarConversaciones";
import { MarcarLeidos } from "@/dominio/casos-de-uso/mensajeria/MarcarLeidos";
import { ContarNoLeidos } from "@/dominio/casos-de-uso/mensajeria/ContarNoLeidos";
import { ServicioMensajeria } from "@/aplicacion/servicios/ServicioMensajeria";

/** Arma el servicio de Mensajería (canal directo + tiempo real). */
export function crearServicioMensajeria(deps: {
  mensajeria: IMensajeriaRepositorio;
  usuarios: IUsuarioRepositorio;
  bus: IBusEventos;
}): ServicioMensajeria {
  return new ServicioMensajeria(
    new EnviarMensaje(deps.mensajeria, deps.usuarios, deps.bus),
    new ObtenerConversacionDePaciente(deps.mensajeria),
    new ListarMensajes(deps.mensajeria),
    new ListarConversaciones(deps.mensajeria),
    new MarcarLeidos(deps.mensajeria),
    new ContarNoLeidos(deps.mensajeria),
  );
}
