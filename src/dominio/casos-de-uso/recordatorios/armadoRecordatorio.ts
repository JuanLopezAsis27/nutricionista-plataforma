import type { Turno } from "../../entidades/Turno";
import type { Paciente } from "../../entidades/Paciente";
import type { ConfiguracionConsultorio } from "../../entidades/ConfiguracionConsultorio";
import type { PlantillaWhatsapp } from "../../entidades/PlantillaWhatsapp";
import type { PlantillaWhatsappEnvio } from "../../servicios/IProveedorWhatsapp";
import { variablesRecordatorio } from "../secretaria/variables";
import {
  normalizarTelefonoE164,
  PREFIJO_PAIS_POR_DEFECTO,
} from "../../servicios/telefono";
import { renderizarPlantilla } from "../whatsapp/plantilla";

/** Recordatorio ya resuelto a teléfono y texto concretos, listo para enviar. */
export interface RecordatorioArmado {
  nombrePaciente: string;
  /** Teléfono del paciente en E.164 sin "+". */
  telefono: string;
  /** Texto final en castellano (vista previa, enlace wa.me y auditoría). */
  mensaje: string;
  /**
   * Envío por plantilla aprobada, cuando la plantilla tiene clave de Meta.
   * null si solo sirve como texto: el proveedor por enlace no lo necesita y el
   * de la API lo rechazaría fuera de la ventana de 24 h.
   */
  envioPlantilla: PlantillaWhatsappEnvio | null;
}

/**
 * Resuelve el texto y el teléfono de un recordatorio a partir del turno, el
 * paciente y la plantilla elegida.
 *
 * Lo comparten la vista previa (que no escribe nada), el envío masivo manual y
 * el barrido automático, para que los tres muestren y manden exactamente lo
 * mismo. Que la vista previa mienta respecto de lo que sale es el modo
 * silencioso en que esto se rompe.
 */
export function armarRecordatorio(
  turno: Turno,
  paciente: Paciente,
  configuracion: ConfiguracionConsultorio,
  plantilla: PlantillaWhatsapp,
): RecordatorioArmado {
  const config = configuracion.aPrimitivos();
  const telefono = normalizarTelefonoE164(
    paciente.telefono,
    config.whatsappPrefijoPais ?? PREFIJO_PAIS_POR_DEFECTO,
  );
  const variables = variablesRecordatorio({
    nombrePaciente: paciente.nombreCompleto,
    fecha: turno.fecha,
    hora: turno.hora,
    nombreProfesional: config.nombreProfesional ?? "tu nutricionista",
  });
  const mensaje = renderizarPlantilla(plantilla.cuerpo, variables);

  return {
    nombrePaciente: paciente.nombreCompleto,
    telefono,
    mensaje,
    envioPlantilla: plantilla.admiteEnvioPorApi
      ? {
          telefono,
          nombrePlantilla: plantilla.claveMeta!,
          idioma: plantilla.idiomaMeta,
          // El orden es el contrato: Meta numera los parámetros ({{1}}, {{2}}…)
          // en vez de nombrarlos, así que la plantilla guarda con qué variable
          // se llena cada posición.
          parametros: plantilla.variablesMeta.map(
            (nombre) => variables[nombre] ?? "",
          ),
          textoEquivalente: mensaje,
        }
      : null,
  };
}
