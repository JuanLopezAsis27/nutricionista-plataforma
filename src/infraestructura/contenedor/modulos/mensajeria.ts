import type { IMensajeriaRepositorio } from "@/dominio/repositorios/IMensajeriaRepositorio";
import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import { MarcarAvisosDeConversacionVistos } from "@/aplicacion/casos-de-uso/notificaciones/MarcarAvisosDeConversacionVistos";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import type { INotificacionRepositorio } from "@/dominio/repositorios/INotificacionRepositorio";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import { EmitirNotificacion } from "@/aplicacion/casos-de-uso/notificaciones/EmitirNotificacion";
import { ObtenerContraparteDelHilo } from "@/aplicacion/casos-de-uso/mensajeria/ObtenerContraparteDelHilo";
import { EnviarMensaje } from "@/aplicacion/casos-de-uso/mensajeria/EnviarMensaje";
import { ObtenerConversacionDePaciente } from "@/aplicacion/casos-de-uso/mensajeria/ObtenerConversacionDePaciente";
import { ListarMensajes } from "@/aplicacion/casos-de-uso/mensajeria/ListarMensajes";
import { ListarConversaciones } from "@/aplicacion/casos-de-uso/mensajeria/ListarConversaciones";
import { MarcarLeidos } from "@/aplicacion/casos-de-uso/mensajeria/MarcarLeidos";
import { ContarNoLeidos } from "@/aplicacion/casos-de-uso/mensajeria/ContarNoLeidos";
import { ServicioMensajeria } from "@/aplicacion/servicios/ServicioMensajeria";

/** Arma el servicio de Mensajería (canal directo + tiempo real). */
export function crearServicioMensajeria(deps: {
  mensajeria: IMensajeriaRepositorio;
  /** La bandeja y el contador suman los dos canales. */
  mensajesWhatsapp: IMensajeWhatsappRepositorio;
  usuarios: IUsuarioRepositorio;
  pacientes: IPacienteRepositorio;
  nutricionistas: INutricionistaRepositorio;
  bus: IBusEventos;
  notificaciones: INotificacionRepositorio;
  reloj: IRelojFecha;
}): ServicioMensajeria {
  return new ServicioMensajeria(
    new EnviarMensaje(
      deps.mensajeria,
      deps.usuarios,
      deps.bus,
      deps.pacientes,
      // Que el mensaje del paciente quede en la campana y se pueda marcar
      // visto, igual que un WhatsApp entrante.
      new EmitirNotificacion(deps.notificaciones, deps.reloj),
    ),
    new ObtenerConversacionDePaciente(deps.mensajeria),
    new ListarMensajes(deps.mensajeria),
    new ListarConversaciones(
      deps.mensajeria,
      deps.mensajesWhatsapp,
      deps.pacientes,
    ),
    new MarcarLeidos(deps.mensajeria),
    new ContarNoLeidos(deps.mensajeria, deps.mensajesWhatsapp),
    new ObtenerContraparteDelHilo(
      deps.usuarios,
      deps.pacientes,
      deps.nutricionistas,
    ),
    new MarcarAvisosDeConversacionVistos(deps.notificaciones, deps.reloj),
  );
}
