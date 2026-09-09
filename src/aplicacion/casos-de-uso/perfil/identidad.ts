/**
 * Cómo se llama y qué cara tiene una cuenta, para mostrarla.
 *
 * Es lo mínimo que comparten "Mi perfil" y el encabezado del chat: los dos
 * necesitan un nombre y una foto, y ninguno de los dos necesita el email, el
 * rol ni nada de la ficha clínica. Tenerlo declarado una vez es lo que evita
 * que el chat termine recibiendo el perfil completo "porque ya estaba".
 */
export interface IdentidadVisible {
  /** Cómo se lo nombra en pantalla. Nunca vacío. */
  nombre: string;
  /** Archivo del bucket con la foto; null si la cuenta no eligió ninguna. */
  fotoArchivoId: string | null;
}

/**
 * Cómo se nombra al profesional cuando no cargó su nombre en Configuración.
 *
 * En el portal del paciente el nutricionista no tiene ficha ni apellido: lo
 * único que hay es `ConfiguracionConsultorio.nombreProfesional`, que es
 * opcional. Sin este respaldo, el encabezado del chat del paciente quedaba
 * vacío en un consultorio recién dado de alta.
 */
export const NOMBRE_PROFESIONAL_POR_DEFECTO = "Tu nutricionista";

/** El nombre del profesional, con el respaldo aplicado. */
export function nombreDelProfesional(configurado: string | null): string {
  return configurado?.trim() || NOMBRE_PROFESIONAL_POR_DEFECTO;
}
