import { CargandoPagina } from "@/componentes/comunes/CargandoPagina";

/**
 * Fallback al pasar de un plan semanal a otro (`semanales/[id]`): el de
 * `planes/loading.tsx` no se activa, porque su segmento no cambia.
 * Ver `docs/NAVEGACION.md`.
 */
export default CargandoPagina;
