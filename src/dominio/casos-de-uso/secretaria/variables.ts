/**
 * Helpers para armar las variables que reemplazan los placeholders de una
 * plantilla. Dominio puro: formatea la fecha por partes UTC (las fechas de
 * turno se guardan a medianoche UTC) para no depender de la zona horaria.
 */

/** Formatea una fecha como DD/MM/AAAA usando sus componentes UTC. */
export function formatearFechaCorta(fecha: Date): string {
  const dd = String(fecha.getUTCDate()).padStart(2, "0");
  const mm = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = fecha.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Variables de un recordatorio de turno concreto. */
export function variablesRecordatorio(datos: {
  nombrePaciente: string;
  fecha: Date;
  hora: string;
  nombreProfesional: string;
}): Record<string, string> {
  return {
    paciente: datos.nombrePaciente,
    fecha: formatearFechaCorta(datos.fecha),
    hora: datos.hora,
    profesional: datos.nombreProfesional,
  };
}

/** Variables de ejemplo para la vista previa / email de prueba. */
export function variablesEjemplo(nombreProfesional: string, hoy: Date): Record<string, string> {
  return {
    paciente: "Juan Pérez",
    fecha: formatearFechaCorta(hoy),
    hora: "10:00",
    profesional: nombreProfesional,
  };
}
