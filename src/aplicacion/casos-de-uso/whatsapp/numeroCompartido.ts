import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { Paciente } from "@/dominio/entidades/Paciente";

/** El número de una ficha y las OTRAS fichas que lo comparten. */
export interface NumeroDeFicha {
  telefono: string | null;
  otras: Paciente[];
}

/**
 * La conversación de WhatsApp es del NÚMERO, no de la ficha (migración 81):
 * si dos hermanos llevan el teléfono de la madre, se habla con la madre, y
 * cada mensaje queda asignado a una sola de las fichas. El hilo, la ventana
 * de 24 h y el «leído» se miran por número para que la conversación se vea
 * entera desde cualquiera de ellas.
 *
 * Una ficha que no existe o no tiene teléfono no comparte nada.
 */
export async function numeroDeFicha(
  pacientes: IPacienteRepositorio,
  pacienteId: string,
): Promise<NumeroDeFicha> {
  const paciente = await pacientes.obtenerPorId(pacienteId);
  const telefono = paciente?.telefonoE164 ?? null;
  if (!telefono) return { telefono: null, otras: [] };
  const todas = await pacientes.listarPorTelefonoE164(telefono);
  return { telefono, otras: todas.filter((p) => p.id !== pacienteId) };
}
