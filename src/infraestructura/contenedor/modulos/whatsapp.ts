import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { IRecordatorioWhatsappRepositorio } from "@/dominio/repositorios/IRecordatorioWhatsappRepositorio";
import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IProveedorWhatsapp } from "@/dominio/servicios/IProveedorWhatsapp";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import { ObtenerVistaPreviaRecordatorio } from "@/dominio/casos-de-uso/whatsapp/ObtenerVistaPreviaRecordatorio";
import { PrepararRecordatorioWhatsapp } from "@/dominio/casos-de-uso/whatsapp/PrepararRecordatorioWhatsapp";
import { ConfirmarRecordatorioWhatsapp } from "@/dominio/casos-de-uso/whatsapp/ConfirmarRecordatorioWhatsapp";
import { ObtenerHiloWhatsapp } from "@/dominio/casos-de-uso/whatsapp/ObtenerHiloWhatsapp";
import { EnviarMensajeWhatsapp } from "@/dominio/casos-de-uso/whatsapp/EnviarMensajeWhatsapp";
import { ProcesarMensajeEntranteWhatsapp } from "@/dominio/casos-de-uso/whatsapp/ProcesarMensajeEntranteWhatsapp";
import { RegistrarEstadoWhatsapp } from "@/dominio/casos-de-uso/whatsapp/RegistrarEstadoWhatsapp";
import { ResolverPacientePorTelefono } from "@/dominio/casos-de-uso/whatsapp/ResolverPacientePorTelefono";
import { ServicioWhatsapp } from "@/aplicacion/servicios/ServicioWhatsapp";

/** Arma el servicio de WhatsApp con sus casos de uso. */
export function crearServicioWhatsapp(deps: {
  turnos: ITurnoRepositorio;
  pacientes: IPacienteRepositorio;
  configuracion: IConfiguracionRepositorio;
  recordatorios: IRecordatorioWhatsappRepositorio;
  mensajes: IMensajeWhatsappRepositorio;
  usuarios: IUsuarioRepositorio;
  proveedor: IProveedorWhatsapp;
  bus: IBusEventos;
}): ServicioWhatsapp {
  // El filtro de ingesta: sin paciente que matchee, el mensaje se descarta.
  const resolverPaciente = new ResolverPacientePorTelefono(deps.pacientes, deps.configuracion);

  return new ServicioWhatsapp(
    new ObtenerVistaPreviaRecordatorio(
      deps.turnos,
      deps.pacientes,
      deps.configuracion,
      deps.proveedor,
    ),
    new PrepararRecordatorioWhatsapp(
      deps.turnos,
      deps.pacientes,
      deps.configuracion,
      deps.recordatorios,
      deps.proveedor,
    ),
    new ConfirmarRecordatorioWhatsapp(deps.recordatorios),
    new ObtenerHiloWhatsapp(deps.mensajes, deps.proveedor),
    new EnviarMensajeWhatsapp(
      deps.mensajes,
      deps.pacientes,
      deps.configuracion,
      deps.proveedor,
    ),
    new ProcesarMensajeEntranteWhatsapp(deps.mensajes, resolverPaciente, deps.usuarios, deps.bus),
    new RegistrarEstadoWhatsapp(deps.mensajes, deps.recordatorios),
  );
}
