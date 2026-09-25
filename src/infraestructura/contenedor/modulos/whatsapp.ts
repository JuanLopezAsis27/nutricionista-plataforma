import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { IRecordatorioWhatsappRepositorio } from "@/dominio/repositorios/IRecordatorioWhatsappRepositorio";
import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IProveedorWhatsapp } from "@/dominio/servicios/IProveedorWhatsapp";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import type { INotificacionRepositorio } from "@/dominio/repositorios/INotificacionRepositorio";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IPlantillaWhatsappRepositorio } from "@/dominio/repositorios/IPlantillaWhatsappRepositorio";
import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IEnlacesTurno } from "@/dominio/servicios/IEnlacesTurno";
import { EnviarPlantillaWhatsapp } from "@/aplicacion/casos-de-uso/whatsapp/EnviarPlantillaWhatsapp";
import { AtenderBotonWhatsapp } from "@/aplicacion/casos-de-uso/whatsapp/AtenderBotonWhatsapp";
import { ConfirmarAsistenciaTurno } from "@/aplicacion/casos-de-uso/turnos/ConfirmarAsistenciaTurno";
import { ObtenerHiloWhatsapp } from "@/aplicacion/casos-de-uso/whatsapp/ObtenerHiloWhatsapp";
import { EnviarMensajeWhatsapp } from "@/aplicacion/casos-de-uso/whatsapp/EnviarMensajeWhatsapp";
import { ProcesarMensajeEntranteWhatsapp } from "@/aplicacion/casos-de-uso/whatsapp/ProcesarMensajeEntranteWhatsapp";
import { RegistrarEstadoWhatsapp } from "@/aplicacion/casos-de-uso/whatsapp/RegistrarEstadoWhatsapp";
import { ResolverPacientePorTelefono } from "@/aplicacion/casos-de-uso/whatsapp/ResolverPacientePorTelefono";
import { RegistrarRespuestaDeRecordatorio } from "@/aplicacion/casos-de-uso/recordatorios/RegistrarRespuestaDeRecordatorio";
import { EmitirNotificacion } from "@/aplicacion/casos-de-uso/notificaciones/EmitirNotificacion";
import { ServicioWhatsapp } from "@/aplicacion/servicios/ServicioWhatsapp";

/**
 * Arma el servicio de WhatsApp (el CANAL: hilo de mensajes + ingesta del
 * webhook). Los recordatorios de turno los arma `./recordatorios`.
 */
export function crearServicioWhatsapp(deps: {
  pacientes: IPacienteRepositorio;
  configuracion: IConfiguracionRepositorio;
  nutricionistas: INutricionistaRepositorio;
  recordatorios: IRecordatorioWhatsappRepositorio;
  mensajes: IMensajeWhatsappRepositorio;
  usuarios: IUsuarioRepositorio;
  proveedor: IProveedorWhatsapp;
  bus: IBusEventos;
  notificaciones: INotificacionRepositorio;
  reloj: IRelojFecha;
  turnos: ITurnoRepositorio;
  plantillas: IPlantillaWhatsappRepositorio;
  establecimientos: IEstablecimientoRepositorio;
  servicioEmail: IServicioEmail;
  enlacesTurno: IEnlacesTurno;
}): ServicioWhatsapp {
  // El filtro de ingesta: sin paciente que matchee, el mensaje se descarta.
  const resolverPaciente = new ResolverPacientePorTelefono(
    deps.pacientes,
    deps.configuracion,
  );

  const emitirNotificacion = new EmitirNotificacion(
    deps.notificaciones,
    deps.reloj,
  );

  return new ServicioWhatsapp(
    new ObtenerHiloWhatsapp(deps.mensajes, deps.proveedor),
    new EnviarMensajeWhatsapp(
      deps.mensajes,
      deps.pacientes,
      deps.configuracion,
      deps.proveedor,
    ),
    new ProcesarMensajeEntranteWhatsapp(
      deps.mensajes,
      resolverPaciente,
      deps.usuarios,
      deps.bus,
      // Que el paciente conteste es lo que cierra el círculo del recordatorio.
      new RegistrarRespuestaDeRecordatorio(deps.recordatorios),
      // Que el WhatsApp quede en la campana, con su estado de visto: el bus
      // solo llega a quien tenga la app abierta en ese momento.
      emitirNotificacion,
      // Los botones de las plantillas: confirmar por el MISMO camino que el
      // enlace del email, para que los dos avisen igual.
      new AtenderBotonWhatsapp(
        deps.turnos,
        new ConfirmarAsistenciaTurno(
          deps.turnos,
          deps.pacientes,
          deps.usuarios,
          deps.servicioEmail,
          deps.bus,
          emitirNotificacion,
        ),
        emitirNotificacion,
      ),
    ),
    new RegistrarEstadoWhatsapp(deps.mensajes, deps.recordatorios),
    new EnviarPlantillaWhatsapp(
      deps.plantillas,
      deps.pacientes,
      deps.turnos,
      deps.establecimientos,
      deps.configuracion,
      deps.mensajes,
      deps.proveedor,
      deps.enlacesTurno,
      deps.reloj,
      deps.nutricionistas,
    ),
  );
}
