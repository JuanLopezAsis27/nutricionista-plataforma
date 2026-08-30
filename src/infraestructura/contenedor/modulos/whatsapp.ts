import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { IRecordatorioWhatsappRepositorio } from "@/dominio/repositorios/IRecordatorioWhatsappRepositorio";
import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IProveedorWhatsapp } from "@/dominio/servicios/IProveedorWhatsapp";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import { ObtenerHiloWhatsapp } from "@/aplicacion/casos-de-uso/whatsapp/ObtenerHiloWhatsapp";
import { EnviarMensajeWhatsapp } from "@/aplicacion/casos-de-uso/whatsapp/EnviarMensajeWhatsapp";
import { ProcesarMensajeEntranteWhatsapp } from "@/aplicacion/casos-de-uso/whatsapp/ProcesarMensajeEntranteWhatsapp";
import { RegistrarEstadoWhatsapp } from "@/aplicacion/casos-de-uso/whatsapp/RegistrarEstadoWhatsapp";
import { ResolverPacientePorTelefono } from "@/aplicacion/casos-de-uso/whatsapp/ResolverPacientePorTelefono";
import { RegistrarRespuestaDeRecordatorio } from "@/aplicacion/casos-de-uso/recordatorios/RegistrarRespuestaDeRecordatorio";
import { ServicioWhatsapp } from "@/aplicacion/servicios/ServicioWhatsapp";

/**
 * Arma el servicio de WhatsApp (el CANAL: hilo de mensajes + ingesta del
 * webhook). Los recordatorios de turno los arma `./recordatorios`.
 */
export function crearServicioWhatsapp(deps: {
  pacientes: IPacienteRepositorio;
  configuracion: IConfiguracionRepositorio;
  recordatorios: IRecordatorioWhatsappRepositorio;
  mensajes: IMensajeWhatsappRepositorio;
  usuarios: IUsuarioRepositorio;
  proveedor: IProveedorWhatsapp;
  bus: IBusEventos;
}): ServicioWhatsapp {
  // El filtro de ingesta: sin paciente que matchee, el mensaje se descarta.
  const resolverPaciente = new ResolverPacientePorTelefono(
    deps.pacientes,
    deps.configuracion,
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
    ),
    new RegistrarEstadoWhatsapp(deps.mensajes, deps.recordatorios),
  );
}
