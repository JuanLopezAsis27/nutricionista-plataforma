import { CLAVE_BIENVENIDA } from "@/dominio/entidades/PlantillaEmail";

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

/**
 * Variables de un recordatorio de turno concreto.
 *
 * `establecimiento` y `direccion` pueden venir vacías: una sede sin dirección
 * cargada es normal, y un consultorio de una sola sede no necesita nombrarla.
 * Se devuelven como cadena vacía y no se omiten porque `renderizarPlantilla`
 * tiene que poder reemplazar el placeholder por algo: dejarlo sin reemplazar
 * mandaría «{{direccion}}» al paciente.
 */
export function variablesRecordatorio(datos: {
  nombrePaciente: string;
  fecha: Date;
  hora: string;
  nombreProfesional: string;
  nombreEstablecimiento?: string | null;
  direccionEstablecimiento?: string | null;
}): Record<string, string> {
  return {
    paciente: datos.nombrePaciente,
    fecha: formatearFechaCorta(datos.fecha),
    hora: datos.hora,
    profesional: datos.nombreProfesional,
    establecimiento: datos.nombreEstablecimiento ?? "",
    direccion: datos.direccionEstablecimiento ?? "",
  };
}

/**
 * Variables del email de bienvenida de un paciente recién creado: además de
 * los nombres, sus datos de acceso al portal.
 */
export function variablesBienvenida(datos: {
  nombrePaciente: string;
  nombreProfesional: string;
  email: string;
  contrasena: string;
}): Record<string, string> {
  return {
    paciente: datos.nombrePaciente,
    profesional: datos.nombreProfesional,
    email: datos.email,
    contrasena: datos.contrasena,
  };
}

/**
 * Variables de ejemplo para la vista previa y el email de prueba de una
 * plantilla.
 *
 * Dependen de la plantilla porque cada envío real reemplaza las suyas: la
 * bienvenida lleva los datos de acceso y el recordatorio, el turno. Si el
 * ejemplo reemplazara una variable que el envío real no tiene, la plantilla
 * se vería bien en la prueba y al paciente le llegaría el placeholder crudo.
 */
export function variablesEjemplo(
  nombreProfesional: string,
  hoy: Date,
  clavePlantilla?: string,
): Record<string, string> {
  if (clavePlantilla === CLAVE_BIENVENIDA) {
    // Nunca una contraseña real: el email de prueba sale a cualquier casilla.
    return variablesBienvenida({
      nombrePaciente: "Juan Pérez",
      nombreProfesional,
      email: "juan.perez@ejemplo.com",
      contrasena: "contraseña-de-ejemplo",
    });
  }
  return {
    paciente: "Juan Pérez",
    fecha: formatearFechaCorta(hoy),
    hora: "10:00",
    profesional: nombreProfesional,
    establecimiento: "Consultorio centro",
    direccion: "Av. Siempreviva 742",
  };
}
