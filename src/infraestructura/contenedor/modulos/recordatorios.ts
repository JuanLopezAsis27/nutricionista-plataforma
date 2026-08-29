import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { IPlantillaWhatsappRepositorio } from "@/dominio/repositorios/IPlantillaWhatsappRepositorio";
import type { IConfiguracionRecordatoriosRepositorio } from "@/dominio/repositorios/IConfiguracionRecordatoriosRepositorio";
import type { IRecordatorioWhatsappRepositorio } from "@/dominio/repositorios/IRecordatorioWhatsappRepositorio";
import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import type { ICuentaConectadaRepositorio } from "@/dominio/repositorios/ICuentaConectadaRepositorio";
import type { IProveedorWhatsapp } from "@/dominio/servicios/IProveedorWhatsapp";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { IPlantillaEmailRepositorio } from "@/dominio/repositorios/IPlantillaEmailRepositorio";
import type { IEmailEnviadoRepositorio } from "@/dominio/repositorios/IEmailEnviadoRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import { EnviarRecordatorioWhatsapp } from "@/dominio/casos-de-uso/recordatorios/EnviarRecordatorioWhatsapp";
import { ObtenerConfiguracionRecordatorios } from "@/dominio/casos-de-uso/recordatorios/ObtenerConfiguracionRecordatorios";
import { GuardarConfiguracionRecordatorios } from "@/dominio/casos-de-uso/recordatorios/GuardarConfiguracionRecordatorios";
import { ListarPlantillasWhatsapp } from "@/dominio/casos-de-uso/recordatorios/ListarPlantillasWhatsapp";
import { CrearPlantillaWhatsapp } from "@/dominio/casos-de-uso/recordatorios/CrearPlantillaWhatsapp";
import { ActualizarPlantillaWhatsapp } from "@/dominio/casos-de-uso/recordatorios/ActualizarPlantillaWhatsapp";
import { EliminarPlantillaWhatsapp } from "@/dominio/casos-de-uso/recordatorios/EliminarPlantillaWhatsapp";
import { ListarTurnosParaRecordar } from "@/dominio/casos-de-uso/recordatorios/ListarTurnosParaRecordar";
import { EnviarRecordatoriosMasivos } from "@/dominio/casos-de-uso/recordatorios/EnviarRecordatoriosMasivos";
import { EnviarRecordatoriosProgramados } from "@/dominio/casos-de-uso/recordatorios/EnviarRecordatoriosProgramados";
import { ListarSeguimientoRecordatorios } from "@/dominio/casos-de-uso/recordatorios/ListarSeguimientoRecordatorios";
import { ListarRecordatoriosPendientes } from "@/dominio/casos-de-uso/recordatorios/ListarRecordatoriosPendientes";
import { ObtenerVistaPreviaRecordatorio } from "@/dominio/casos-de-uso/recordatorios/ObtenerVistaPreviaRecordatorio";
import { ConfirmarRecordatorioWhatsapp } from "@/dominio/casos-de-uso/recordatorios/ConfirmarRecordatorioWhatsapp";
import { EnviarRecordatoriosPorEmail } from "@/dominio/casos-de-uso/recordatorios/EnviarRecordatoriosPorEmail";
import { ServicioRecordatorios } from "@/aplicacion/servicios/ServicioRecordatorios";
import { ServicioConfiguracionRecordatorios } from "@/aplicacion/servicios/recordatorios/ServicioConfiguracionRecordatorios";
import { ServicioPlantillasWhatsapp } from "@/aplicacion/servicios/recordatorios/ServicioPlantillasWhatsapp";
import { ServicioEnvioRecordatorios } from "@/aplicacion/servicios/recordatorios/ServicioEnvioRecordatorios";
import { ServicioSeguimientoRecordatorios } from "@/aplicacion/servicios/recordatorios/ServicioSeguimientoRecordatorios";

/** Dependencias del módulo de recordatorios. */
export interface DepsRecordatorios {
  turnos: ITurnoRepositorio;
  pacientes: IPacienteRepositorio;
  configuracion: IConfiguracionRepositorio;
  plantillas: IPlantillaWhatsappRepositorio;
  configRecordatorios: IConfiguracionRecordatoriosRepositorio;
  recordatorios: IRecordatorioWhatsappRepositorio;
  mensajes: IMensajeWhatsappRepositorio;
  cuentas: ICuentaConectadaRepositorio | null;
  proveedor: IProveedorWhatsapp;
  reloj: IRelojFecha;
  // El medio email: comparte la política, así que su envío se arma acá y no
  // en Secretaría, que conserva solo el TEXTO de la plantilla.
  plantillasEmail: IPlantillaEmailRepositorio;
  emailsEnviados: IEmailEnviadoRepositorio;
  servicioEmail: IServicioEmail;
  usuarios: IUsuarioRepositorio;
  bus: IBusEventos;
  nombreProfesional: string;
}

/**
 * El motor de envío de UN recordatorio.
 *
 * Se arma aparte porque lo comparten tres entradas —la consola masiva, el
 * barrido del worker y el botón de un turno suelto— y las tres tienen que
 * tomar las mismas decisiones sobre duplicados y reintentos.
 */
export function crearEnviarRecordatorioWhatsapp(deps: {
  recordatorios: IRecordatorioWhatsappRepositorio;
  proveedor: IProveedorWhatsapp;
}): EnviarRecordatorioWhatsapp {
  return new EnviarRecordatorioWhatsapp(deps.recordatorios, deps.proveedor);
}

/** Arma el servicio de Recordatorios con sus casos de uso. */
export function crearServicioRecordatorios(
  deps: DepsRecordatorios,
): ServicioRecordatorios {
  const enviarUno = crearEnviarRecordatorioWhatsapp(deps);
  // Una sola instancia del envío por email: la comparten el barrido automático
  // y la consola manual, que tienen que mandar exactamente lo mismo.
  const enviarEmail = new EnviarRecordatoriosPorEmail(
    deps.plantillasEmail,
    deps.emailsEnviados,
    deps.turnos,
    deps.pacientes,
    deps.servicioEmail,
    deps.reloj,
    deps.configRecordatorios,
    deps.nombreProfesional,
  );

  // Cada servicio recibe SOLO lo de su area. Antes era una lista plana de 17
  // argumentos posicionales, con cuatro colaboradores sueltos al final.
  return new ServicioRecordatorios(
    new ServicioConfiguracionRecordatorios(
      new ObtenerConfiguracionRecordatorios(deps.configRecordatorios),
      new GuardarConfiguracionRecordatorios(deps.configRecordatorios),
      deps.proveedor,
      deps.cuentas,
    ),
    new ServicioPlantillasWhatsapp(
      new ListarPlantillasWhatsapp(deps.plantillas),
      new CrearPlantillaWhatsapp(deps.plantillas),
      new ActualizarPlantillaWhatsapp(deps.plantillas),
      new EliminarPlantillaWhatsapp(deps.plantillas),
    ),
    new ServicioEnvioRecordatorios(
      new ListarTurnosParaRecordar(
        deps.turnos,
        deps.pacientes,
        deps.configuracion,
        deps.recordatorios,
        deps.reloj,
      ),
      new EnviarRecordatoriosMasivos(
        deps.turnos,
        deps.pacientes,
        deps.configuracion,
        deps.plantillas,
        deps.configRecordatorios,
        deps.recordatorios,
        enviarUno,
        enviarEmail,
      ),
      new EnviarRecordatoriosProgramados(
        deps.turnos,
        deps.pacientes,
        deps.configuracion,
        deps.plantillas,
        deps.configRecordatorios,
        deps.recordatorios,
        enviarUno,
        enviarEmail,
        deps.reloj,
      ),
      new ObtenerVistaPreviaRecordatorio(
        deps.turnos,
        deps.pacientes,
        deps.configuracion,
        deps.plantillas,
        deps.proveedor,
      ),
      deps.usuarios,
      deps.bus,
    ),
    new ServicioSeguimientoRecordatorios(
      new ListarSeguimientoRecordatorios(
        deps.recordatorios,
        deps.mensajes,
        deps.pacientes,
        deps.turnos,
        deps.proveedor,
        deps.reloj,
      ),
      new ListarRecordatoriosPendientes(
        deps.recordatorios,
        deps.pacientes,
        deps.turnos,
      ),
      new ConfirmarRecordatorioWhatsapp(deps.recordatorios),
    ),
  );
}
