/**
 * Rutas del panel a las que se llega desde más de un lugar (enlaces de otras
 * pantallas y vueltas de route handlers). Escritas una sola vez para que
 * mover una pantalla no deje enlaces apuntando a la dirección vieja.
 */

/**
 * Integraciones es una pestaña de Configuración (antes era su propia
 * sección). Lleva la pestaña en la URL para que el OAuth de Google y los
 * enlaces de Recordatorios aterricen en ella y no en «Membrete».
 */
export const RUTA_INTEGRACIONES =
  "/dashboard/configuracion?pestana=integraciones";

/** Donde se configuran los campos de la ficha y la antropometría. */
export const RUTA_CONFIGURACION_FICHA =
  "/dashboard/configuracion?pestana=ficha";
