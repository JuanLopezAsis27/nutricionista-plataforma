import { redirect } from "next/navigation";
import { RUTA_PLANES_SEMANALES } from "@/componentes/planes-semanales/rutas";

/**
 * `/dashboard/planes/semanales` sin un id: el listado vive en la pestaña
 * «Planes semanales» de `/dashboard/planes`, así que se manda ahí.
 */
export default function PaginaPlanesSemanales(): never {
  redirect(RUTA_PLANES_SEMANALES);
}
