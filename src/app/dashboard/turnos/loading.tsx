import { CargandoPagina } from "@/componentes/comunes/CargandoPagina";

/**
 * Fallback de la ruta mientras el servidor responde. Sin él la navegación
 * espera la respuesta con la pantalla anterior quieta, y en el celular no se
 * distingue un toque que no entró de una pantalla que está cargando.
 * Ver `docs/NAVEGACION.md`.
 */
export default CargandoPagina;
