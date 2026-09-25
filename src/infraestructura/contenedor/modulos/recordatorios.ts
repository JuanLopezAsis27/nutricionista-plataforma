import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { IPlantillaWhatsappRepositorio } from "@/dominio/repositorios/IPlantillaWhatsappRepositorio";
import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
import type { IConfiguracionRecordatoriosRepositorio } from "@/dominio/repositorios/IConfiguracionRecordatoriosRepositorio";
import type { IRecordatorioWhatsappRepositorio } from "@/dominio/repositorios/IRecordatorioWhatsappRepositorio";
import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import type { ICuentaConectadaRepositorio } from "@/dominio/repositorios/ICuentaConectadaRepositorio";
import type { IProveedorWhatsapp } from "@/dominio/servicios/IProveedorWhatsapp";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { IPlantillaEmailRecordatorioRepositorio } from "@/dominio/repositorios/IPlantillaEmailRecordatorioRepositorio";
import type { IEmailEnviadoRepositorio } from "@/dominio/repositorios/IEmailEnviadoRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import type { IEnlacesTurno } from "@/dominio/servicios/IEnlacesTurno";
import type { IAdministradorPlantillasMeta } from "@/dominio/servicios/IAdministradorPlantillasMeta";
import { SincronizarPlantillasMeta } from "@/aplicacion/casos-de-uso/recordatorios/SincronizarPlantillasMeta";
import { RegistrarEstadosPlantillasMeta } from "@/aplicacion/casos-de-uso/recordatorios/RegistrarEstadosPlantillasMeta";
import { EnviarRecordatorioWhatsapp } from "@/aplicacion/casos-de-uso/recordatorios/EnviarRecordatorioWhatsapp";
import { ObtenerConfiguracionRecordatorios } from "@/aplicacion/casos-de-uso/recordatorios/ObtenerConfiguracionRecordatorios";
import { GuardarConfiguracionRecordatorios } from "@/aplicacion/casos-de-uso/recordatorios/GuardarConfiguracionRecordatorios";
import { ListarPlantillasWhatsapp } from "@/aplicacion/casos-de-uso/recordatorios/ListarPlantillasWhatsapp";
import { CrearPlantillaWhatsapp } from "@/aplicacion/casos-de-uso/recordatorios/CrearPlantillaWhatsapp";
import { ActualizarPlantillaWhatsapp } from "@/aplicacion/casos-de-uso/recordatorios/ActualizarPlantillaWhatsapp";
import { EliminarPlantillaWhatsapp } from "@/aplicacion/casos-de-uso/recordatorios/EliminarPlantillaWhatsapp";
import { ListarPlantillasEmailRecordatorio } from "@/aplicacion/casos-de-uso/recordatorios/ListarPlantillasEmailRecordatorio";
import { CrearPlantillaEmailRecordatorio } from "@/aplicacion/casos-de-uso/recordatorios/CrearPlantillaEmailRecordatorio";
import { ActualizarPlantillaEmailRecordatorio } from "@/aplicacion/casos-de-uso/recordatorios/ActualizarPlantillaEmailRecordatorio";
import { EliminarPlantillaEmailRecordatorio } from "@/aplicacion/casos-de-uso/recordatorios/EliminarPlantillaEmailRecordatorio";
import { ListarTurnosParaRecordar } from "@/aplicacion/casos-de-uso/recordatorios/ListarTurnosParaRecordar";
import { EnviarRecordatoriosMasivos } from "@/aplicacion/casos-de-uso/recordatorios/EnviarRecordatoriosMasivos";
import { EnviarRecordatoriosProgramados } from "@/aplicacion/casos-de-uso/recordatorios/EnviarRecordatoriosProgramados";
import { ListarSeguimientoRecordatorios } from "@/aplicacion/casos-de-uso/recordatorios/ListarSeguimientoRecordatorios";
import { ListarRecordatoriosPendientes } from "@/aplicacion/casos-de-uso/recordatorios/ListarRecordatoriosPendientes";
import { ObtenerVistaPreviaRecordatorio } from "@/aplicacion/casos-de-uso/recordatorios/ObtenerVistaPreviaRecordatorio";
import { ConfirmarRecordatorioWhatsapp } from "@/aplicacion/casos-de-uso/recordatorios/ConfirmarRecordatorioWhatsapp";
import { EnviarRecordatoriosPorEmail } from "@/aplicacion/casos-de-uso/recordatorios/EnviarRecordatoriosPorEmail";
import { ServicioRecordatorios } from "@/aplicacion/servicios/ServicioRecordatorios";
import { ServicioConfiguracionRecordatorios } from "@/aplicacion/servicios/recordatorios/ServicioConfiguracionRecordatorios";
import { ServicioPlantillasWhatsapp } from "@/aplicacion/servicios/recordatorios/ServicioPlantillasWhatsapp";
import { ServicioPlantillasEmailRecordatorio } from "@/aplicacion/servicios/recordatorios/ServicioPlantillasEmailRecordatorio";
import { ServicioEnvioRecordatorios } from "@/aplicacion/servicios/recordatorios/ServicioEnvioRecordatorios";
import { ServicioSeguimientoRecordatorios } from "@/aplicacion/servicios/recordatorios/ServicioSeguimientoRecordatorios";

/** Dependencias del módulo de recordatorios. */
export interface DepsRecordatorios {
  turnos: ITurnoRepositorio;
  pacientes: IPacienteRepositorio;
  configuracion: IConfiguracionRepositorio;
  /** Da {{profesional}}: el nombre del consultorio (`nutricionistas.nombre`). */
  nutricionistas: INutricionistaRepositorio;
  plantillas: IPlantillaWhatsappRepositorio;
  /** Da el nombre y la dirección de la sede a {{establecimiento}}/{{direccion}}. */
  establecimientos: IEstablecimientoRepositorio;
  configRecordatorios: IConfiguracionRecordatoriosRepositorio;
  recordatorios: IRecordatorioWhatsappRepositorio;
  mensajes: IMensajeWhatsappRepositorio;
  cuentas: ICuentaConectadaRepositorio | null;
  proveedor: IProveedorWhatsapp;
  reloj: IRelojFecha;
  // El medio email: comparte la política, así que su envío se arma acá y no
  // en Secretaría, que conserva solo el TEXTO de las plantillas propias
  // (bienvenida y demás). Las del recordatorio viven en este módulo, junto a
  // las de WhatsApp: son dos vías del mismo aviso.
  plantillasEmailRecordatorio: IPlantillaEmailRecordatorioRepositorio;
  emailsEnviados: IEmailEnviadoRepositorio;
  servicioEmail: IServicioEmail;
  usuarios: IUsuarioRepositorio;
  bus: IBusEventos;
  enlacesTurno: IEnlacesTurno;
  /** Alta, edición y estado de las plantillas en la cuenta de Meta. */
  administradorPlantillasMeta: IAdministradorPlantillasMeta;
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
  mensajes: IMensajeWhatsappRepositorio;
  enlacesTurno: IEnlacesTurno;
  nutricionistas: INutricionistaRepositorio;
}): EnviarRecordatorioWhatsapp {
  return new EnviarRecordatorioWhatsapp(
    deps.recordatorios,
    deps.proveedor,
    deps.mensajes,
    deps.enlacesTurno,
    deps.nutricionistas,
  );
}

/** Arma el servicio de Recordatorios con sus casos de uso. */
export function crearServicioRecordatorios(
  deps: DepsRecordatorios,
): ServicioRecordatorios {
  const enviarUno = crearEnviarRecordatorioWhatsapp(deps);
  // La comparten el webhook de estados y la consulta manual a Meta.
  const registrarEstadosMeta = new RegistrarEstadosPlantillasMeta(
    deps.plantillas,
  );
  // Una sola instancia del envío por email: la comparten el barrido automático
  // y la consola manual, que tienen que mandar exactamente lo mismo.
  const enviarEmail = new EnviarRecordatoriosPorEmail(
    deps.plantillasEmailRecordatorio,
    deps.emailsEnviados,
    deps.turnos,
    deps.pacientes,
    deps.servicioEmail,
    deps.reloj,
    deps.configRecordatorios,
    deps.nutricionistas,
    deps.establecimientos,
    deps.enlacesTurno,
    deps.configuracion,
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
      new CrearPlantillaWhatsapp(
        deps.plantillas,
        deps.administradorPlantillasMeta,
        deps.enlacesTurno,
      ),
      new ActualizarPlantillaWhatsapp(
        deps.plantillas,
        deps.administradorPlantillasMeta,
        deps.enlacesTurno,
      ),
      new EliminarPlantillaWhatsapp(
        deps.plantillas,
        deps.administradorPlantillasMeta,
      ),
      new SincronizarPlantillasMeta(
        deps.administradorPlantillasMeta,
        registrarEstadosMeta,
      ),
      registrarEstadosMeta,
    ),
    new ServicioPlantillasEmailRecordatorio(
      new ListarPlantillasEmailRecordatorio(deps.plantillasEmailRecordatorio),
      new CrearPlantillaEmailRecordatorio(deps.plantillasEmailRecordatorio),
      new ActualizarPlantillaEmailRecordatorio(
        deps.plantillasEmailRecordatorio,
      ),
      new EliminarPlantillaEmailRecordatorio(deps.plantillasEmailRecordatorio),
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
        deps.establecimientos,
        deps.reloj,
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
        deps.establecimientos,
      ),
      new ObtenerVistaPreviaRecordatorio(
        deps.turnos,
        deps.pacientes,
        deps.configuracion,
        deps.plantillas,
        deps.proveedor,
        deps.establecimientos,
        deps.reloj,
        deps.nutricionistas,
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
