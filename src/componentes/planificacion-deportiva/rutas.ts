/** Las rutas del módulo de planificación deportiva, en un solo lugar. */

export const RUTA_PLANIFICACION = "/dashboard/planificacion-deportiva";

export function rutaPlanificacion(id: string): string {
  return `${RUTA_PLANIFICACION}/${id}`;
}

export function rutaEditarPlanificacion(id: string, volver?: string): string {
  const base = `${RUTA_PLANIFICACION}/${id}/editar`;
  return volver ? `${base}?volver=${encodeURIComponent(volver)}` : base;
}

/**
 * La alta. Con `pacienteId` se crea desde la ficha: va a su carpeta y queda
 * asignada (y atada a la competencia, si viene). `volver` es a dónde se
 * regresa al guardar o cancelar.
 */
export function rutaNuevaPlanificacion(
  opciones: {
    pacienteId?: string;
    competenciaId?: string;
    grupoId?: string | null;
    volver?: string;
  } = {},
): string {
  const parametros = new URLSearchParams();
  if (opciones.pacienteId) parametros.set("pacienteId", opciones.pacienteId);
  if (opciones.competenciaId) {
    parametros.set("competenciaId", opciones.competenciaId);
  }
  if (opciones.grupoId) parametros.set("grupoId", opciones.grupoId);
  if (opciones.volver) parametros.set("volver", opciones.volver);
  const consulta = parametros.toString();
  return `${RUTA_PLANIFICACION}/nueva${consulta ? `?${consulta}` : ""}`;
}

/**
 * Un `volver` que vino por la URL solo se acepta si es una ruta del panel:
 * aceptar cualquiera convertiría la pantalla en un redireccionador abierto.
 */
export function volverSeguro(valor: string | null | undefined): string | null {
  return valor && valor.startsWith("/dashboard/") && !valor.startsWith("//")
    ? valor
    : null;
}

/** La pestaña «Deporte» de la ficha de un paciente. */
export function rutaDeporteDelPaciente(pacienteId: string): string {
  return `/dashboard/pacientes/${pacienteId}?pestana=deporte`;
}
