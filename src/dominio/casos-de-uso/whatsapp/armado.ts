import type { Turno } from "../../entidades/Turno";
import type { Paciente } from "../../entidades/Paciente";
import type { ConfiguracionConsultorio } from "../../entidades/ConfiguracionConsultorio";
import { variablesRecordatorio } from "../secretaria/variables";
import { normalizarTelefonoE164, PREFIJO_PAIS_POR_DEFECTO } from "./telefono";
import { PLANTILLA_WHATSAPP_POR_DEFECTO, renderizarPlantilla } from "./plantilla";

/** Recordatorio ya resuelto a teléfono y texto concretos, listo para enviar. */
export interface RecordatorioArmado {
  nombrePaciente: string;
  /** Teléfono del paciente en E.164 sin "+". */
  telefono: string;
  mensaje: string;
}

/**
 * Resuelve el texto y el teléfono del recordatorio a partir del turno, el
 * paciente y la configuración del consultorio.
 *
 * Lo comparten la vista previa (que no escribe nada) y la preparación (que
 * registra la fila), para que las dos muestren exactamente lo mismo.
 */
export function armarRecordatorio(
  turno: Turno,
  paciente: Paciente,
  configuracion: ConfiguracionConsultorio,
): RecordatorioArmado {
  const config = configuracion.aPrimitivos();
  const telefono = normalizarTelefonoE164(
    paciente.telefono,
    config.whatsappPrefijoPais ?? PREFIJO_PAIS_POR_DEFECTO,
  );
  const mensaje = renderizarPlantilla(
    config.whatsappPlantilla ?? PLANTILLA_WHATSAPP_POR_DEFECTO,
    variablesRecordatorio({
      nombrePaciente: paciente.nombreCompleto,
      fecha: turno.fecha,
      hora: turno.hora,
      nombreProfesional: config.nombreProfesional ?? "tu nutricionista",
    }),
  );

  return { nombrePaciente: paciente.nombreCompleto, telefono, mensaje };
}
